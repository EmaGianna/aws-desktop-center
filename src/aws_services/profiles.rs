use std::fs;

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
