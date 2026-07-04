use super::get_endpoint_url;
use serde::Serialize;
use std::fs;

#[derive(Serialize)]
pub struct ProfileInfo {
    pub name: String,
    pub endpoint_url: String,
    pub is_emulated: bool,
}

#[tauri::command]
pub fn get_profiles() -> Vec<String> {
    let home = dirs::home_dir().unwrap_or_default();
    let creds_path = home.join(".aws").join("credentials");
    let config_path = home.join(".aws").join("config");

    let mut profiles = Vec::new();
    for path in [creds_path, config_path] {
        if let Ok(content) = fs::read_to_string(&path) {
            for line in content.lines() {
                if let Some(name) = line.strip_prefix('[').and_then(|l| l.strip_suffix(']')) {
                    let name = name.replace("profile ", "");
                    if !profiles.contains(&name) {
                        profiles.push(name);
                    }
                }
            }
        }
    }
    profiles
}

#[tauri::command]
pub fn get_profile_info(profile: String) -> ProfileInfo {
    let endpoint = get_endpoint_url(&profile);
    ProfileInfo {
        name: profile,
        is_emulated: endpoint.is_some(),
        endpoint_url: endpoint.unwrap_or_default(),
    }
}
