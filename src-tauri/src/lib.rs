use notify::event::{CreateKind, ModifyKind, RemoveKind};
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

// ==================== 配置管理 ====================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OpenAIConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(rename = "openAI", default)]
    pub open_ai: OpenAIConfig,
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
                    let change_event = FileChangeEvent {
                        event_type: event_type.to_string(),
                        path: path.to_string_lossy().to_string(),
                    };
                    let _ = app_handle.emit("file-change", change_event);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    // 开始监视指定文件夹
    watcher
        .watch(
            PathBuf::from(&folder_path).as_path(),
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
        *wp = Some(folder_path);
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
        open_ai: OpenAIConfig {
            base_url: "https://api.deepseek.com".to_string(),
            api_key: String::new(),
            model: "deepseek-chat".to_string(),
        },
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
    let (api_key, base_url, model) = {
        let config = config_state.0.lock().map_err(|e| e.to_string())?;

        if config.open_ai.api_key.is_empty() {
            return Err("OpenAI API key is not configured.".to_string());
        }

        (
            config.open_ai.api_key.clone(),
            config.open_ai.base_url.clone(),
            config.open_ai.model.clone(),
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
fn get_ai_settings(config_state: State<'_, ConfigState>) -> Result<OpenAIConfig, String> {
    let config = config_state.0.lock().map_err(|e| e.to_string())?;
    Ok(config.open_ai.clone())
}

#[tauri::command]
fn save_ai_settings(
    config_state: State<'_, ConfigState>,
    base_url: String,
    api_key: String,
    model: String,
) -> Result<bool, String> {
    let mut config = config_state.0.lock().map_err(|e| e.to_string())?;
    config.open_ai = OpenAIConfig {
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
) -> Result<bool, String> {
    let mut config = config_state.0.lock().map_err(|e| e.to_string())?;
    config.general = GeneralSettings {
        language: language.trim().to_string(),
        auto_save,
        auto_save_interval,
        restore_on_start,
        open_last_workspace,
    };
    save_config(&config)?;
    Ok(true)
}

// ==================== 文件操作 ====================

#[derive(Debug, Serialize, Deserialize)]
struct FileInfo {
    name: String,
    path: String,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
    children: Option<Vec<FileInfo>>,
}

#[tauri::command]
async fn get_folder_content(folder_path: String) -> Result<Vec<FileInfo>, String> {
    let path = PathBuf::from(&folder_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", folder_path));
    }

    fn traverse_folder(path: &PathBuf) -> Result<Vec<FileInfo>, String> {
        let mut entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        let mut result = Vec::new();

        // entries.next() 返回 Option<Result<DirEntry, Error>>
        while let Some(entry_result) = entries.next() {
            let entry = entry_result.map_err(|e| e.to_string())?;
            let file_path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            let is_dir = file_path.is_dir();
            let mut file_info = FileInfo {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_directory: is_dir,
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
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    if path.is_dir() {
        return Ok(vec![serde_json::Value::Number(0.into())]);
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
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    dir.push("plugins");
    Ok(dir.to_string_lossy().to_string())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
