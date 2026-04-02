use notify::event::{CreateKind, ModifyKind, RemoveKind};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

// ==================== 配置管理 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            provider: "deepseek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            api_key: String::new(),
            model: "deepseek-chat".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub language: String,
    #[serde(rename = "autoSave", default)]
    pub auto_save: bool,
    #[serde(rename = "autoSaveInterval", default = "default_auto_save_interval")]
    pub auto_save_interval: u32,
    #[serde(rename = "restoreOnStart", default)]
    pub restore_on_start: bool,
    #[serde(rename = "openLastWorkspace", default)]
    pub open_last_workspace: bool,
    #[serde(rename = "theme", default = "default_theme")]
    pub theme: String,
}

fn default_theme() -> String {
    "system".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorSettings {
    #[serde(rename = "focusMode", default)]
    pub focus_mode: bool,
}

fn default_auto_save_interval() -> u32 {
    30
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            language: "en-US".to_string(),
            auto_save: true,
            auto_save_interval: 30,
            restore_on_start: true,
            open_last_workspace: false,
            theme: default_theme(),
        }
    }
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self {
            focus_mode: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(rename = "ai", default)]
    pub ai_config: AIConfig,
    #[serde(rename = "editor", default)]
    pub editor: EditorSettings,
}

pub struct ConfigState(pub Mutex<AppConfig>);

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

                    // Skip .lampsave auto-save files at the source to prevent tree flicker.
                    if path_str.ends_with(".lampsave") {
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

fn get_config_path() -> PathBuf {
    let mut path = std::env::current_exe().unwrap_or_default();
    path.set_file_name("config.json");
    if !path.exists() {
        // 尝试在项目根目录
        path = PathBuf::from("config.json");
    }
    path
}

fn load_config() -> AppConfig {
    let config_path = get_config_path();
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    // 默认配置
    AppConfig {
        general: GeneralSettings::default(),
        ai_config: AIConfig {
            provider: "deepseek".to_string(),
            base_url: "https://api.deepseek.com".to_string(),
            api_key: String::new(),
            model: "deepseek-chat".to_string(),
        },
        editor: EditorSettings::default(),
    }
}

fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path();
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(config_path, content).map_err(|e| e.to_string())?;
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
        let config = config_state.0.lock().map_err(|e| e.to_string())?;

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
    let config = config_state.0.lock().map_err(|e| e.to_string())?;
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
    let mut config = config_state.0.lock().map_err(|e| e.to_string())?;
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
    save_config(&config)?;
    Ok(true)
}

#[tauri::command]
fn get_general_settings(config_state: State<'_, ConfigState>) -> Result<GeneralSettings, String> {
    let config = config_state.0.lock().map_err(|e| e.to_string())?;
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
    let mut config = config_state.0.lock().map_err(|e| e.to_string())?;
    config.general = GeneralSettings {
        language: language.trim().to_string(),
        auto_save,
        auto_save_interval,
        restore_on_start,
        open_last_workspace,
        theme: theme.trim().to_string(),
    };
    save_config(&config)?;
    Ok(true)
}

#[tauri::command]
fn get_editor_settings(config_state: State<'_, ConfigState>) -> Result<EditorSettings, String> {
    let config = config_state.0.lock().map_err(|e| e.to_string())?;
    Ok(config.editor.clone())
}

#[tauri::command]
fn save_editor_settings(
    config_state: State<'_, ConfigState>,
    focus_mode: bool,
) -> Result<bool, String> {
    let mut config = config_state.0.lock().map_err(|e| e.to_string())?;
    config.editor = EditorSettings { focus_mode };
    save_config(&config)?;
    Ok(true)
}

// ==================== 文件操作 ====================

fn supported_extensions() -> &'static [&'static str] {
    &["lmph", "lampsave", "md", "html", "htm", "txt", "text"]
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
        let mut entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        while let Some(entry_result) = entries.next() {
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

    let file_name = path.file_name()
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
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
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
fn close_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
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

fn default_max_results() -> usize { 1000 }

#[derive(Debug, Clone, Deserialize)]
struct SearchOptions {
    #[serde(rename = "caseSensitive", default)]
    case_sensitive: bool,
    #[serde(rename = "wholeWord", default)]
    whole_word: bool,
    #[serde(rename = "maxResults", default = "default_max_results")]
    max_results: usize,
}

fn strip_html_tags(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut in_tag = false;
    for ch in input.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out
}

fn decode_basic_html_entities(input: &str) -> String {
    input
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

fn strip_markdown_formatting(input: &str) -> String {
    let mut line = input.trim_start().to_string();

    // Headings, blockquotes, list bullets and ordered list prefixes.
    while line.starts_with('#') {
        line = line[1..].trim_start().to_string();
    }
    while line.starts_with('>') {
        line = line[1..].trim_start().to_string();
    }
    for bullet in ["- ", "* ", "+ "] {
        if line.starts_with(bullet) {
            line = line[2..].trim_start().to_string();
            break;
        }
    }
    if let Some(dot_idx) = line.find(". ") {
        if line[..dot_idx].chars().all(|c| c.is_ascii_digit()) {
            line = line[dot_idx + 2..].trim_start().to_string();
        }
    }

    // Link/image wrappers and common markdown markers.
    line = line.replace("![](", "").replace("[", "").replace("](", " ").replace(")", "");
    line = line.replace("**", "").replace("__", "").replace('*', "").replace('_', "");
    line = line.replace('`', "").replace("~~", "");
    line
}

fn to_rendered_line(file_name: &str, line: &str) -> String {
    let lower = file_name.to_lowercase();
    if lower.ends_with(".html")
        || lower.ends_with(".htm")
        || lower.ends_with(".lmph")
        || lower.ends_with(".lampsave")
    {
        return decode_basic_html_entities(&strip_html_tags(line));
    }
    if lower.ends_with(".md") {
        return strip_markdown_formatting(&decode_basic_html_entities(&strip_html_tags(line)));
    }
    decode_basic_html_entities(line)
}

fn is_html_like_file(file_name: &str) -> bool {
    let lower = file_name.to_lowercase();
    lower.ends_with(".html")
        || lower.ends_with(".htm")
        || lower.ends_with(".lmph")
        || lower.ends_with(".lampsave")
}

fn is_block_like_html_tag(tag_name: &str) -> bool {
    matches!(
        tag_name,
        "p"
            | "h1"
            | "h2"
            | "h3"
            | "h4"
            | "h5"
            | "h6"
            | "li"
            | "blockquote"
            | "pre"
            | "div"
            | "section"
            | "article"
            | "br"
            | "hr"
    )
}

fn parse_html_tag(raw_tag: &str) -> Option<(String, bool, bool)> {
    let trimmed = raw_tag.trim();
    if trimmed.is_empty() || trimmed.starts_with('!') || trimmed.starts_with('?') {
        return None;
    }

    let is_closing = trimmed.starts_with('/');
    let body = if is_closing {
        trimmed[1..].trim_start()
    } else {
        trimmed
    };
    let name: String = body
        .chars()
        .take_while(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_lowercase();
    if name.is_empty() {
        return None;
    }
    let is_self_closing = body.trim_end().ends_with('/');
    Some((name, is_closing, is_self_closing))
}

fn to_rendered_lines_with_source(file_name: &str, content: &str) -> Vec<(usize, String)> {
    if is_html_like_file(file_name) {
        let mut out = Vec::new();
        let mut current = String::new();
        let mut rendered_line_number = 1usize;
        let mut in_tag = false;
        let mut tag_buf = String::new();

        let flush_current = |out: &mut Vec<(usize, String)>,
                             current: &mut String,
                             rendered_line_number: &mut usize,
                             advance_if_empty: bool| {
            let rendered = decode_basic_html_entities(current.trim()).trim().to_string();
            if !rendered.is_empty() {
                out.push((*rendered_line_number, rendered));
                *rendered_line_number += 1;
            } else if advance_if_empty {
                *rendered_line_number += 1;
            }
            current.clear();
        };

        for ch in content.chars() {
            if in_tag {
                if ch == '>' {
                    if let Some((name, is_closing, is_self_closing)) = parse_html_tag(&tag_buf) {
                        if is_block_like_html_tag(&name) {
                            if !is_closing {
                                flush_current(
                                    &mut out,
                                    &mut current,
                                    &mut rendered_line_number,
                                    false,
                                );
                            }
                            if is_closing || is_self_closing || name == "br" || name == "hr" {
                                flush_current(
                                    &mut out,
                                    &mut current,
                                    &mut rendered_line_number,
                                    true,
                                );
                            }
                        }
                    }
                    tag_buf.clear();
                    in_tag = false;
                } else {
                    tag_buf.push(ch);
                }
                continue;
            }

            match ch {
                '<' => {
                    in_tag = true;
                    tag_buf.clear();
                }
                '\n' => {
                    if !current.is_empty() && !current.ends_with(' ') {
                        current.push(' ');
                    }
                }
                _ => {
                    current.push(ch);
                }
            }
        }

        flush_current(&mut out, &mut current, &mut rendered_line_number, false);
        return out;
    }

    content
        .lines()
        .enumerate()
        .map(|(idx, line)| (idx + 1, to_rendered_line(file_name, line)))
        .collect()
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

    let max_results = options.max_results.max(1).min(10000);
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

        let rendered_lines = to_rendered_lines_with_source(&file_name, &content);

        let rendered_query = to_rendered_line(&file_name, query_str).trim().to_string();
        if rendered_query.is_empty() {
            return None;
        }

        // Always use lowercase for searching, but track positions in original
        let query_needle = if case_sensitive {
            rendered_query
        } else {
            rendered_query.to_lowercase()
        };

        let mut matches = Vec::new();

        for (source_line_number, rendered_line) in rendered_lines.iter() {
            if *total_matches >= max_results {
                break;
            }

            let line = rendered_line.trim_end().to_string();
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
                            .map(|c| c.is_alphanumeric())
                            .unwrap_or(false);
                    let after_ok = match_end_byte >= search_line.len()
                        || !search_line[match_end_byte..]
                            .chars()
                            .next()
                            .map(|c| c.is_alphanumeric())
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
                    if let Some(result) =
                        search_file(&path, query_lower, case_sensitive, whole_word, max_results, total_matches)
                    {
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
    let mut results = traverse_and_search(&path, &query_lower, options.case_sensitive, options.whole_word, max_results, &mut total_matches);

    // Sort by number of matches descending
    results.sort_by(|a, b| b.matches.len().cmp(&a.matches.len()));

    Ok(results)
}

// ==================== 应用入口 ====================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let config = load_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ConfigState(Mutex::new(config)))
        .manage(WatcherState::default())
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
