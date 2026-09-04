use notify::event::{CreateKind, ModifyKind, RemoveKind};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

// ==================== 配置管理 ====================

mod config;
use config::{AIConfig, ConfigState, EditorSettings, GeneralSettings};

pub struct WindowCloseState(pub Mutex<bool>);

const ATOMIC_WRITE_PREFIX: &str = ".lamp-write-";

fn write_file_atomically(path: &Path, content: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let existing_permissions = fs::metadata(path)
        .ok()
        .map(|metadata| metadata.permissions());

    let mut temp = tempfile::Builder::new()
        .prefix(ATOMIC_WRITE_PREFIX)
        .tempfile_in(parent)
        .map_err(|e| e.to_string())?;
    temp.write_all(content).map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;

    if let Some(permissions) = existing_permissions {
        fs::set_permissions(temp.path(), permissions).map_err(|e| e.to_string())?;
    }

    temp.persist(path).map_err(|e| e.error.to_string())?;
    Ok(())
}

// ==================== 文件监视 ====================

// 文件变化事件
#[derive(Clone, Serialize)]
pub struct FileChangeEvent {
    pub event_type: String, // "create", "modify", "remove"
    pub path: String,
}

// 文件监视器状态
pub struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    watch_path: Mutex<Option<String>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            watch_path: Mutex::new(None),
        }
    }
}

// 开始监视文件夹
#[tauri::command]
async fn start_watching(
    app: AppHandle,
    state: State<'_, WatcherState>,
    folder_path: String,
) -> Result<(), String> {
    // 停止现有的监视
    {
        let mut watcher = state.watcher.lock().map_err(|e| e.to_string())?;
        *watcher = None;
    }
    {
        let mut watch_path = state.watch_path.lock().map_err(|e| e.to_string())?;
        *watch_path = None;
    }

    let app_handle = app.clone();

    // 创建新的监视器
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    // 文件/文件夹创建
                    notify::EventKind::Create(CreateKind::File) => "create",
                    notify::EventKind::Create(CreateKind::Folder) => "create",
                    notify::EventKind::Create(CreateKind::Any) => "create",
                    // 文件修改
                    notify::EventKind::Modify(ModifyKind::Data(_)) => "modify",
                    notify::EventKind::Modify(ModifyKind::Name(_)) => "modify",
                    notify::EventKind::Modify(ModifyKind::Any) => "modify",
                    // 文件/文件夹删除
                    notify::EventKind::Remove(RemoveKind::File) => "remove",
                    notify::EventKind::Remove(RemoveKind::Folder) => "remove",
                    notify::EventKind::Remove(RemoveKind::Any) => "remove",
                    // 其他变化（如重命名、移动）
                    notify::EventKind::Other => "change",
                    _ => return,
                };

                for path in event.paths {
                    let path_str = path.to_string_lossy();

                    // Skip .autosave auto-save files at the source to prevent tree flicker.
                    if path_str.ends_with(".autosave")
                        || path.file_name().is_some_and(|name| {
                            name.to_string_lossy().starts_with(ATOMIC_WRITE_PREFIX)
                        })
                    {
                        continue;
                    }

                    let change_event = FileChangeEvent {
                        event_type: event_type.to_string(),
                        // Normalize to forward slashes for consistent path matching in JS.
                        path: path_str.replace('\\', "/"),
                    };
                    let _ = app_handle.emit("file-change", change_event);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    // Normalize to forward slashes for consistent comparison with tree node paths.
    let decoded_folder_path = folder_path.replace('\\', "/");
    watcher
        .watch(
            PathBuf::from(&decoded_folder_path).as_path(),
            RecursiveMode::Recursive,
        )
        .map_err(|e| e.to_string())?;

    // 保存监视器状态
    {
        let mut w = state.watcher.lock().map_err(|e| e.to_string())?;
        *w = Some(watcher);
    }
    {
        let mut wp = state.watch_path.lock().map_err(|e| e.to_string())?;
        *wp = Some(decoded_folder_path);
    }

    log::info!("Started watching folder");
    Ok(())
}

// 停止监视
#[tauri::command]
async fn stop_watching(state: State<'_, WatcherState>) -> Result<(), String> {
    let mut watcher = state.watcher.lock().map_err(|e| e.to_string())?;
    *watcher = None;

    let mut watch_path = state.watch_path.lock().map_err(|e| e.to_string())?;
    *watch_path = None;

    log::info!("Stopped watching folder");
    Ok(())
}

// ==================== AI 聊天 ====================

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Choice {
    message: ChatMessage,
}

#[tauri::command]
async fn ai_chat(
    config_state: State<'_, ConfigState>,
    prompt: String,
    message: String,
) -> Result<String, String> {
    // 先获取锁，克隆需要的数据，然后释放锁
    let (_provider, api_key, base_url, model) = {
        let config = config_state.config.lock().map_err(|e| e.to_string())?;

        if config.ai_config.api_key.is_empty() {
            return Err("OpenAI API key is not configured.".to_string());
        }

        (
            config.ai_config.provider.clone(),
            config.ai_config.api_key.clone(),
            config.ai_config.base_url.clone(),
            config.ai_config.model.clone(),
        )
    }; // 锁在这里释放

    let base_url = if base_url.is_empty() {
        "https://api.deepseek.com".to_string()
    } else {
        base_url
    };

    let model = if model.is_empty() {
        "deepseek-chat".to_string()
    } else {
        model
    };

    let client = reqwest::Client::new();
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));

    let request = ChatRequest {
        model,
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: prompt,
            },
            ChatMessage {
                role: "user".to_string(),
                content: message,
            },
        ],
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API request failed: {} - {}", status, body));
    }

    let chat_response: ChatResponse = response.json().await.map_err(|e| e.to_string())?;

    chat_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| "No response from AI".to_string())
}

#[tauri::command]
fn get_ai_settings(config_state: State<'_, ConfigState>) -> Result<AIConfig, String> {
    let config = config_state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.ai_config.clone())
}

#[tauri::command]
fn save_ai_settings(
    config_state: State<'_, ConfigState>,
    provider: String,
    base_url: String,
    api_key: String,
    model: String,
) -> Result<bool, String> {
    config_state.update(|config| {
        config.ai_config = AIConfig {
            provider: provider.trim().to_string(),
            base_url: base_url.trim().to_string(),
            api_key: api_key.trim().to_string(),
            model: if model.trim().is_empty() {
                "deepseek-chat".to_string()
            } else {
                model.trim().to_string()
            },
        };
    })?;
    Ok(true)
}

#[tauri::command]
fn get_general_settings(config_state: State<'_, ConfigState>) -> Result<GeneralSettings, String> {
    let config = config_state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.general.clone())
}

#[tauri::command]
fn save_general_settings(
    config_state: State<'_, ConfigState>,
    language: String,
    auto_save: bool,
    auto_save_interval: u32,
    restore_on_start: bool,
    open_last_workspace: bool,
    theme: String,
) -> Result<bool, String> {
    config_state.update(|config| {
        config.general = GeneralSettings {
            language: language.trim().to_string(),
            auto_save,
            auto_save_interval,
            restore_on_start,
            open_last_workspace,
            theme: theme.trim().to_string(),
        };
    })?;
    Ok(true)
}

#[tauri::command]
fn get_editor_settings(config_state: State<'_, ConfigState>) -> Result<EditorSettings, String> {
    let config = config_state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.editor.clone())
}

#[tauri::command]
fn save_editor_settings(
    config_state: State<'_, ConfigState>,
    focus_mode: bool,
) -> Result<bool, String> {
    config_state.update(|config| {
        config.editor = EditorSettings { focus_mode };
    })?;
    Ok(true)
}

// ==================== 文件操作 ====================

fn supported_extensions() -> &'static [&'static str] {
    &["lmph", "md", "html", "htm", "txt", "text"]
}

fn is_supported_file(name: &str) -> bool {
    let name_lower = name.to_lowercase();
    // Has an extension and it matches
    if let Some(dot_pos) = name_lower.rfind('.') {
        let ext = &name_lower[dot_pos + 1..];
        supported_extensions().contains(&ext)
    } else {
        // No extension — treat as unsupported
        false
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct FileInfo {
    name: String,
    path: String,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
    #[serde(rename = "isSupported")]
    is_supported: bool,
    children: Option<Vec<FileInfo>>,
}

#[tauri::command]
async fn get_folder_content(folder_path: String) -> Result<Vec<FileInfo>, String> {
    // Normalize to forward slashes for consistent path comparison in JS.
    let normalized = folder_path.replace('\\', "/");
    let path = PathBuf::from(&normalized);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", normalized));
    }

    fn traverse_folder(path: &PathBuf) -> Result<Vec<FileInfo>, String> {
        let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        for entry_result in entries {
            let entry = entry_result.map_err(|e| e.to_string())?;
            let file_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            // Skip dotfiles and dotfolders (e.g. .lamp, .git, .DS_Store)
            if file_name.starts_with('.') {
                continue;
            }

            // Normalize all paths to forward slashes for JS consumption.
            let path_str = file_path.to_string_lossy().replace('\\', "/");
            let is_dir = file_path.is_dir();
            let is_supported = !is_dir && is_supported_file(&file_name);
            let mut file_info = FileInfo {
                name: file_name,
                path: path_str,
                is_directory: is_dir,
                is_supported,
                children: None,
            };

            if is_dir {
                file_info.children = Some(traverse_folder(&file_path)?);
            }

            result.push(file_info);
        }

        // 排序：文件夹在前，文件在后
        result.sort_by(|a, b| {
            if a.is_directory == b.is_directory {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            } else if a.is_directory {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        });

        Ok(result)
    }

    traverse_folder(&path)
}

#[tauri::command]
async fn open_specific_file(file_path: String) -> Result<Vec<serde_json::Value>, String> {
    // Normalize to forward slashes for consistent comparison with workspace paths.
    let normalized = file_path.replace('\\', "/");
    let path = PathBuf::from(&normalized);

    if !path.exists() {
        return Err(format!("File does not exist: {}", normalized));
    }

    if path.is_dir() {
        return Ok(vec![serde_json::Value::Number(0.into())]);
    }

    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    if !is_supported_file(&file_name) {
        return Err(format!(
            "Unsupported format: Lamp does not support opening .{}. Supported formats: {}.",
            path.extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_else(|| "file".to_string()),
            supported_extensions().join(", ")
        ));
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(vec![
        serde_json::Value::Number(1.into()),
        serde_json::Value::String(content),
    ])
}

#[tauri::command]
async fn has_file(file_path: String) -> Result<bool, String> {
    let path = PathBuf::from(&file_path);
    Ok(path.exists())
}

#[tauri::command]
async fn delete_file(file_path: String) -> Result<bool, String> {
    let path = PathBuf::from(&file_path);
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
async fn save_file_content(file_path: String, content: String) -> Result<(), String> {
    write_file_atomically(Path::new(&file_path), content.as_bytes())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveFileOutcome {
    saved: bool,
    current_content: Option<String>,
}

fn save_file_content_if_unchanged_impl(
    path: &Path,
    content: &str,
    expected_content: Option<&str>,
) -> Result<SaveFileOutcome, String> {
    if let Some(expected) = expected_content {
        match fs::read_to_string(path) {
            Ok(current) if current != expected => {
                return Ok(SaveFileOutcome {
                    saved: false,
                    current_content: Some(current),
                });
            }
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(SaveFileOutcome {
                    saved: false,
                    current_content: None,
                });
            }
            Err(error) => return Err(error.to_string()),
        }
    }

    write_file_atomically(path, content.as_bytes())?;
    Ok(SaveFileOutcome {
        saved: true,
        current_content: None,
    })
}

#[tauri::command]
async fn save_file_content_if_unchanged(
    file_path: String,
    content: String,
    expected_content: Option<String>,
) -> Result<SaveFileOutcome, String> {
    save_file_content_if_unchanged_impl(
        Path::new(&file_path),
        &content,
        expected_content.as_deref(),
    )
}

// ==================== 自动保存临时文件 ====================

/// 获取自动保存临时目录路径
#[tauri::command]
fn get_auto_save_dir(app: AppHandle) -> Result<String, String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("autosave");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir.to_string_lossy().to_string())
}

#[derive(Debug, Clone, Serialize)]
pub struct AutoSaveFileInfo {
    pub tab_id: String,
    pub original_path: String,
    pub temp_path: String,
    pub title: String,
    pub content: String,
    pub saved_at: u64,
}

#[derive(Debug, Clone, Deserialize)]
struct AutoSavePayload {
    #[serde(rename = "tabId", default)]
    tab_id: String,
    #[serde(rename = "originalPath", default)]
    original_path: String,
    #[serde(default)]
    title: String,
    #[serde(default)]
    content: String,
    #[serde(rename = "savedAt", default)]
    saved_at: u64,
}

/// 列出所有自动保存的临时文件
#[tauri::command]
async fn list_auto_save_files(app: AppHandle) -> Result<Vec<AutoSaveFileInfo>, String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("autosave");

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.extension().is_some_and(|e| e == "autosave") {
            if let Some(stem) = path.file_stem() {
                let stem_str = stem.to_string_lossy();
                // 文件名格式: <tabId>_<timestamp> 或 <encoded_path>_<timestamp>
                if let Some(underscore_pos) = stem_str.rfind('_') {
                    let timestamp_str = &stem_str[underscore_pos + 1..];
                    let encoded = &stem_str[..underscore_pos];

                    if let Ok(timestamp) = timestamp_str.parse::<u64>() {
                        let raw = fs::read_to_string(&path).unwrap_or_default();
                        let payload = serde_json::from_str::<AutoSavePayload>(&raw).ok();
                        let fallback_title = path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| "untitled".to_string());

                        result.push(AutoSaveFileInfo {
                            tab_id: payload
                                .as_ref()
                                .map(|p| p.tab_id.clone())
                                .filter(|id| !id.is_empty())
                                .unwrap_or_else(|| encoded.to_string()),
                            original_path: payload
                                .as_ref()
                                .map(|p| p.original_path.clone())
                                .unwrap_or_default(),
                            temp_path: path.to_string_lossy().to_string(),
                            title: payload
                                .as_ref()
                                .map(|p| p.title.clone())
                                .filter(|title| !title.is_empty())
                                .unwrap_or(fallback_title),
                            content: payload.as_ref().map(|p| p.content.clone()).unwrap_or(raw),
                            saved_at: payload
                                .as_ref()
                                .map(|p| p.saved_at)
                                .filter(|saved_at| *saved_at > 0)
                                .unwrap_or(timestamp),
                        });
                    }
                }
            }
        }
    }

    result.sort_by_key(|entry| Reverse(entry.saved_at));
    Ok(result)
}

/// 清理所有自动保存的临时文件
#[tauri::command]
async fn clear_auto_save_files(app: AppHandle) -> Result<(), String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("autosave");

    if !dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            let _ = fs::remove_file(path);
        }
    }
    Ok(())
}

// ==================== 窗口管理 ====================

#[tauri::command]
fn minimize_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

#[tauri::command]
fn maximize_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn close_window(app: AppHandle, close_state: State<'_, WindowCloseState>) -> Result<(), String> {
    {
        let mut allow_close = close_state.0.lock().map_err(|e| e.to_string())?;
        *allow_close = true;
    }
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn toggle_fullscreen(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
        window
            .set_fullscreen(!is_fullscreen)
            .map_err(|e| e.to_string())?;
        Ok(!is_fullscreen)
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
fn is_maximized(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        window.is_maximized().map_err(|e| e.to_string())
    } else {
        Err("Window not found".to_string())
    }
}

// ==================== 工作区操作 ====================

// 检查文件是否在工作区内
#[tauri::command]
async fn is_file_in_directory(file_path: String, dir_path: String) -> Result<bool, String> {
    let file = PathBuf::from(&file_path);
    let dir = PathBuf::from(&dir_path);

    // 尝试规范化路径后比较
    match (file.canonicalize(), dir.canonicalize()) {
        (Ok(file_canonical), Ok(dir_canonical)) => Ok(file_canonical.starts_with(dir_canonical)),
        _ => {
            // 如果无法规范化，直接比较前缀
            let normalized_file = file_path.replace('\\', "/");
            let normalized_dir = dir_path.replace('\\', "/");
            Ok(normalized_file
                .to_lowercase()
                .starts_with(&normalized_dir.to_lowercase()))
        }
    }
}

// ==================== 插件操作 ====================

/// 读取文本文件内容（供 PluginLoader 使用）
#[tauri::command]
async fn read_text_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

/// 获取应用数据目录（用于用户插件存储）
#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// 获取用户插件目录 (~/.lamp/plugins/ 或等效路径)
#[tauri::command]
fn get_user_plugins_dir(app: AppHandle) -> Result<String, String> {
    let mut dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    dir.push("plugins");
    Ok(dir.to_string_lossy().to_string())
}

// ==================== 搜索操作 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SearchMatch {
    #[serde(rename = "lineNumber")]
    line_number: usize,
    line: String,
    #[serde(rename = "matchStart")]
    match_start: usize,
    #[serde(rename = "matchEnd")]
    match_end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileSearchResult {
    path: String,
    name: String,
    matches: Vec<SearchMatch>,
}

fn default_max_results() -> usize {
    1000
}

fn is_search_word_char(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '_'
}

#[derive(Debug, Clone, Deserialize)]
struct SearchOptions {
    #[serde(rename = "caseSensitive", default)]
    case_sensitive: bool,
    #[serde(rename = "wholeWord", default)]
    whole_word: bool,
    #[serde(rename = "maxResults", default = "default_max_results")]
    max_results: usize,
}

#[tauri::command]
async fn search_workspace(
    workspace_path: String,
    query: String,
    options: SearchOptions,
) -> Result<Vec<FileSearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let normalized = workspace_path.replace('\\', "/");
    let path = PathBuf::from(&normalized);

    if !path.exists() || !path.is_dir() {
        return Err(format!("Invalid workspace path: {}", normalized));
    }

    let max_results = options.max_results.clamp(1, 10000);
    let mut total_matches = 0;

    fn search_file(
        file_path: &PathBuf,
        query_str: &str,
        case_sensitive: bool,
        whole_word: bool,
        max_results: usize,
        total_matches: &mut usize,
    ) -> Option<FileSearchResult> {
        if *total_matches >= max_results {
            return None;
        }

        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => return None,
        };

        let file_name = file_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let source_lines = content
            .lines()
            .enumerate()
            .map(|(idx, line)| (idx + 1, line.to_string()))
            .collect::<Vec<_>>();

        let search_query = query_str.trim().to_string();
        if search_query.is_empty() {
            return None;
        }

        // Always use lowercase for searching, but track positions in original
        let query_needle = if case_sensitive {
            search_query
        } else {
            search_query.to_lowercase()
        };

        let mut matches = Vec::new();

        for (source_line_number, source_line) in source_lines.iter() {
            if *total_matches >= max_results {
                break;
            }

            let line = source_line.trim_end().to_string();
            if line.is_empty() {
                continue;
            }
            let search_line = if case_sensitive {
                line.clone()
            } else {
                line.to_lowercase()
            };

            let mut start = 0;
            while let Some(pos) = search_line[start..].find(&query_needle) {
                let abs_pos = start + pos;
                let match_end_byte = abs_pos + query_needle.len();
                let next_step = search_line[abs_pos..]
                    .chars()
                    .next()
                    .map(|c| c.len_utf8())
                    .unwrap_or(1);

                if whole_word {
                    let before_ok = abs_pos == 0
                        || !search_line[..abs_pos]
                            .chars()
                            .next_back()
                            .map(is_search_word_char)
                            .unwrap_or(false);
                    let after_ok = match_end_byte >= search_line.len()
                        || !search_line[match_end_byte..]
                            .chars()
                            .next()
                            .map(is_search_word_char)
                            .unwrap_or(false);

                    if !before_ok || !after_ok {
                        start = abs_pos + next_step;
                        continue;
                    }
                }

                let match_start = search_line[..abs_pos].chars().count();
                let match_end = search_line[..match_end_byte].chars().count();

                matches.push(SearchMatch {
                    line_number: *source_line_number,
                    line: line.clone(),
                    match_start,
                    match_end,
                });
                *total_matches += 1;
                start = abs_pos + next_step;
            }
        }

        if matches.is_empty() {
            return None;
        }

        let path_str = file_path.to_string_lossy().replace('\\', "/");

        Some(FileSearchResult {
            path: path_str,
            name: file_name,
            matches,
        })
    }

    fn traverse_and_search(
        dir: &PathBuf,
        query_lower: &str,
        case_sensitive: bool,
        whole_word: bool,
        max_results: usize,
        total_matches: &mut usize,
    ) -> Vec<FileSearchResult> {
        let mut results = Vec::new();

        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return results,
        };

        for entry in entries.flatten() {
            if *total_matches >= max_results {
                break;
            }

            let path = entry.path();

            if path.is_dir() {
                let name: String = entry.file_name().to_string_lossy().into_owned();
                if name.starts_with('.') {
                    continue;
                }
                results.extend(traverse_and_search(
                    &path,
                    query_lower,
                    case_sensitive,
                    whole_word,
                    max_results,
                    total_matches,
                ));
            } else if path.is_file() {
                let name = entry.file_name().to_string_lossy().to_string();
                if is_supported_file(&name) {
                    if let Some(result) = search_file(
                        &path,
                        query_lower,
                        case_sensitive,
                        whole_word,
                        max_results,
                        total_matches,
                    ) {
                        results.push(result);
                    }
                }
            }
        }

        results
    }

    let query_lower = if options.case_sensitive {
        query.clone()
    } else {
        query.to_lowercase()
    };
    let mut results = traverse_and_search(
        &path,
        &query_lower,
        options.case_sensitive,
        options.whole_word,
        max_results,
        &mut total_matches,
    );

    // Sort by number of matches descending
    results.sort_by_key(|result| Reverse(result.matches.len()));

    Ok(results)
}

// ==================== 应用入口 ====================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir()?;
            let config = ConfigState::load(&app_data, &config::legacy_config_paths())
                .map_err(std::io::Error::other)?;
            app.manage(config);
            Ok(())
        })
        .manage(WindowCloseState(Mutex::new(false)))
        .manage(WatcherState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let should_allow_close = app
                    .state::<WindowCloseState>()
                    .0
                    .lock()
                    .map(|mut allow_close| {
                        if *allow_close {
                            *allow_close = false;
                            true
                        } else {
                            false
                        }
                    })
                    .unwrap_or(false);

                if !should_allow_close {
                    api.prevent_close();
                    let _ = window.emit("window-close-requested", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // AI
            ai_chat,
            get_ai_settings,
            save_ai_settings,
            // 通用设置
            get_general_settings,
            save_general_settings,
            get_editor_settings,
            save_editor_settings,
            // 文件操作
            get_folder_content,
            open_specific_file,
            has_file,
            delete_file,
            save_file_content,
            save_file_content_if_unchanged,
            get_auto_save_dir,
            list_auto_save_files,
            clear_auto_save_files,
            // 窗口管理
            minimize_window,
            maximize_window,
            close_window,
            toggle_fullscreen,
            is_maximized,
            // 工作区
            is_file_in_directory,
            start_watching,
            stop_watching,
            // 插件
            read_text_file,
            get_app_data_dir,
            get_user_plugins_dir,
            // 搜索
            search_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{save_file_content_if_unchanged_impl, write_file_atomically};
    use std::fs;

    #[test]
    fn atomic_write_creates_and_replaces_file_content() {
        let dir = tempfile::tempdir().expect("create temp directory");
        let path = dir.path().join("draft.md");

        write_file_atomically(&path, b"first draft").expect("create document");
        write_file_atomically(&path, b"second draft").expect("replace document");

        assert_eq!(fs::read(&path).expect("read document"), b"second draft");
        let leftovers = fs::read_dir(dir.path())
            .expect("read temp directory")
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(".lamp-write-")
            })
            .count();
        assert_eq!(leftovers, 0);
    }

    #[test]
    fn conditional_write_refuses_to_overwrite_external_changes() {
        let dir = tempfile::tempdir().expect("create temp directory");
        let path = dir.path().join("draft.md");
        fs::write(&path, b"opened content").expect("create document");
        fs::write(&path, b"external content").expect("change document externally");

        let outcome =
            save_file_content_if_unchanged_impl(&path, "lamp content", Some("opened content"))
                .expect("check conditional save");

        assert!(!outcome.saved);
        assert_eq!(outcome.current_content.as_deref(), Some("external content"));
        assert_eq!(
            fs::read_to_string(&path).expect("read document"),
            "external content"
        );
    }

    #[cfg(unix)]
    #[test]
    fn atomic_write_preserves_existing_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let dir = tempfile::tempdir().expect("create temp directory");
        let path = dir.path().join("draft.md");
        fs::write(&path, b"first draft").expect("create document");
        fs::set_permissions(&path, fs::Permissions::from_mode(0o640))
            .expect("set document permissions");

        write_file_atomically(&path, b"second draft").expect("replace document");

        let mode = fs::metadata(&path)
            .expect("read metadata")
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o640);
    }
}
