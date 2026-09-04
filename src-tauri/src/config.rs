use crate::write_file_atomically;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(rename = "ai", default)]
    pub ai_config: AIConfig,
    #[serde(rename = "editor", default)]
    pub editor: EditorSettings,
}

pub struct ConfigState {
    pub config: Mutex<AppConfig>,
    path: PathBuf,
}

impl ConfigState {
    pub fn load(app_data: &Path, legacy_paths: &[PathBuf]) -> Result<Self, String> {
        let path = app_data.join("config.json");
        let config = match read_config(&path)? {
            Some(config) => config,
            None => {
                let mut migrated = None;
                for legacy_path in legacy_paths {
                    if legacy_path == &path {
                        continue;
                    }
                    if let Some(config) = read_config(legacy_path)? {
                        migrated = Some(config);
                        break;
                    }
                }
                let config = migrated.unwrap_or_default();
                fs::create_dir_all(app_data)
                    .map_err(|e| format!("Cannot create settings directory: {e}"))?;
                save_config(&path, &config)?;
                config
            }
        };
        Ok(Self {
            config: Mutex::new(config),
            path,
        })
    }

    pub fn update(&self, apply: impl FnOnce(&mut AppConfig)) -> Result<(), String> {
        let mut current = self.config.lock().map_err(|e| e.to_string())?;
        let mut next = current.clone();
        apply(&mut next);
        // Publish the new in-memory settings only after durable storage succeeds.
        save_config(&self.path, &next)?;
        *current = next;
        Ok(())
    }
}

fn read_config(path: &Path) -> Result<Option<AppConfig>, String> {
    match fs::read_to_string(path) {
        Ok(content) => serde_json::from_str(&content)
            .map(Some)
            .map_err(|e| format!("Invalid settings file {}: {e}", path.display())),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!(
            "Cannot read settings file {}: {error}",
            path.display()
        )),
    }
}

fn save_config(path: &Path, config: &AppConfig) -> Result<(), String> {
    let content = serde_json::to_vec_pretty(config).map_err(|e| e.to_string())?;
    write_file_atomically(path, &content)
}

pub fn legacy_config_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            paths.push(parent.join("config.json"));
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let path = cwd.join("config.json");
        if !paths.contains(&path) {
            paths.push(path);
        }
    }
    paths
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_legacy(path: &Path, model: &str) {
        let mut config = AppConfig::default();
        config.ai_config.model = model.to_string();
        save_config(path, &config).unwrap();
    }

    #[test]
    fn fresh_settings_are_created_in_app_data() {
        let dir = tempfile::tempdir().unwrap();
        let app_data = dir.path().join("app-data");
        let state = ConfigState::load(&app_data, &[]).unwrap();
        assert_eq!(state.path, app_data.join("config.json"));
        assert!(state.path.is_file());
    }

    #[test]
    fn migrates_legacy_settings_once_without_deleting_the_original() {
        let dir = tempfile::tempdir().unwrap();
        let legacy = dir.path().join("config.json");
        write_legacy(&legacy, "legacy-model");
        let app_data = dir.path().join("app-data");
        let state = ConfigState::load(&app_data, std::slice::from_ref(&legacy)).unwrap();
        assert_eq!(state.config.lock().unwrap().ai_config.model, "legacy-model");
        state
            .update(|config| config.ai_config.model = "saved-model".into())
            .unwrap();
        write_legacy(&legacy, "changed-legacy-model");
        let next = ConfigState::load(&app_data, std::slice::from_ref(&legacy)).unwrap();
        assert_eq!(next.config.lock().unwrap().ai_config.model, "saved-model");
        assert_eq!(
            read_config(&legacy).unwrap().unwrap().ai_config.model,
            "changed-legacy-model"
        );
    }

    #[test]
    fn migration_prefers_executable_location_over_working_directory() {
        let dir = tempfile::tempdir().unwrap();
        let exe = dir.path().join("exe.json");
        let cwd = dir.path().join("cwd.json");
        write_legacy(&exe, "exe-model");
        write_legacy(&cwd, "cwd-model");
        let state = ConfigState::load(&dir.path().join("app-data"), &[exe, cwd]).unwrap();
        assert_eq!(state.config.lock().unwrap().ai_config.model, "exe-model");
    }

    #[test]
    fn existing_settings_ignore_other_launch_directories() {
        let dir = tempfile::tempdir().unwrap();
        let app_data = dir.path().join("app-data");
        let state = ConfigState::load(&app_data, &[]).unwrap();
        state
            .update(|config| config.general.theme = "dark".into())
            .unwrap();
        let unrelated = dir.path().join("config.json");
        fs::write(&unrelated, "invalid json").unwrap();
        let reopened = ConfigState::load(&app_data, &[unrelated]).unwrap();
        assert_eq!(reopened.config.lock().unwrap().general.theme, "dark");
    }

    #[test]
    fn malformed_settings_are_reported_and_not_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        fs::write(&path, "invalid json").unwrap();
        assert!(ConfigState::load(dir.path(), &[]).is_err());
        assert_eq!(fs::read_to_string(path).unwrap(), "invalid json");
    }

    #[test]
    fn failed_write_does_not_change_live_settings() {
        let dir = tempfile::tempdir().unwrap();
        let state = ConfigState {
            config: Mutex::new(AppConfig::default()),
            path: dir.path().to_path_buf(),
        };
        let original = state.config.lock().unwrap().general.theme.clone();
        assert!(state
            .update(|config| config.general.theme = "dark".into())
            .is_err());
        assert_eq!(state.config.lock().unwrap().general.theme, original);
    }
}
