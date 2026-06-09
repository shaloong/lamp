use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// ==================== 配置管理 ====================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OpenAIConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub language: String,
    #[serde(rename = "openAI")]
    pub open_ai: OpenAIConfig,
}

pub struct ConfigState(pub Mutex<AppConfig>);

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
        language: "en".to_string(),
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
        .invoke_handler(tauri::generate_handler![
            // AI
            ai_chat,
            get_ai_settings,
            save_ai_settings,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
