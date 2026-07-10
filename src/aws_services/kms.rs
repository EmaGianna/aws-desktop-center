use super::load_config;
use aws_sdk_kms::Client;
use serde::Serialize;

pub async fn create_kms_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct KmsKey {
    pub id: String,
    pub arn: String,
    pub description: String,
    pub state: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn kms_list_keys(profile: String) -> Result<Vec<KmsKey>, String> {
    let client = create_kms_client(&profile).await;
    let resp = client.list_keys().send().await.map_err(|e| e.to_string())?;
    let mut keys = Vec::new();
    for k in resp.keys() {
        let key_id = k.key_id().unwrap_or_default().to_string();
        let detail = client.describe_key().key_id(&key_id).send().await.map_err(|e| e.to_string())?;
        if let Some(meta) = detail.key_metadata() {
            keys.push(KmsKey {
                id: key_id,
                arn: meta.arn().unwrap_or_default().to_string(),
                description: meta.description().unwrap_or_default().to_string(),
                state: meta.key_state().map(|s| s.as_str().to_string()).unwrap_or_default(),
                enabled: meta.enabled(),
            });
        }
    }
    Ok(keys)
}

#[tauri::command]
pub async fn kms_create_key(profile: String, description: String) -> Result<String, String> {
    let client = create_kms_client(&profile).await;
    let resp = client.create_key().description(&description).send().await.map_err(|e| e.to_string())?;
    Ok(resp.key_metadata().map(|m| m.key_id()).unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn kms_enable_key(profile: String, key_id: String) -> Result<String, String> {
    let client = create_kms_client(&profile).await;
    client.enable_key().key_id(&key_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Key {} enabled", key_id))
}

#[tauri::command]
pub async fn kms_disable_key(profile: String, key_id: String) -> Result<String, String> {
    let client = create_kms_client(&profile).await;
    client.disable_key().key_id(&key_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Key {} disabled", key_id))
}

#[tauri::command]
pub async fn kms_schedule_key_deletion(profile: String, key_id: String, pending_window_days: i32) -> Result<String, String> {
    let client = create_kms_client(&profile).await;
    client.schedule_key_deletion().key_id(&key_id).pending_window_in_days(pending_window_days).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Key {} scheduled for deletion", key_id))
}
