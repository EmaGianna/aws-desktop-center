use super::load_config;
use aws_sdk_secretsmanager::Client;
use serde::Serialize;

pub async fn create_secretsmanager_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Secret {
    pub name: String,
    pub arn: String,
    pub description: String,
    pub last_changed_date: String,
}

#[tauri::command]
pub async fn secrets_list(profile: String) -> Result<Vec<Secret>, String> {
    let client = create_secretsmanager_client(&profile).await;
    let resp = client.list_secrets().send().await.map_err(|e| e.to_string())?;
    Ok(resp.secret_list().iter().map(|s| Secret {
        name: s.name().unwrap_or_default().to_string(),
        arn: s.arn().unwrap_or_default().to_string(),
        description: s.description().unwrap_or_default().to_string(),
        last_changed_date: s.last_changed_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn secrets_get_value(profile: String, secret_id: String) -> Result<String, String> {
    let client = create_secretsmanager_client(&profile).await;
    let resp = client.get_secret_value().secret_id(&secret_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.secret_string().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn secrets_create(profile: String, name: String, secret_string: String) -> Result<String, String> {
    let client = create_secretsmanager_client(&profile).await;
    let resp = client.create_secret().name(&name).secret_string(&secret_string).send().await.map_err(|e| e.to_string())?;
    Ok(resp.arn().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn secrets_update_value(profile: String, secret_id: String, secret_string: String) -> Result<String, String> {
    let client = create_secretsmanager_client(&profile).await;
    client.put_secret_value().secret_id(&secret_id).secret_string(&secret_string).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Secret {} updated", secret_id))
}

#[tauri::command]
pub async fn secrets_delete(profile: String, secret_id: String) -> Result<String, String> {
    let client = create_secretsmanager_client(&profile).await;
    client.delete_secret().secret_id(&secret_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Secret {} scheduled for deletion", secret_id))
}
