use super::load_config;
use aws_sdk_transfer::Client;
use serde::Serialize;

pub async fn create_transfer_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct TransferServer {
    pub id: String,
    pub state: String,
    pub domain: String,
    pub identity_provider_type: String,
}

#[tauri::command]
pub async fn transfer_list_servers(profile: String) -> Result<Vec<TransferServer>, String> {
    let client = create_transfer_client(&profile).await;
    let resp = client.list_servers().send().await.map_err(|e| e.to_string())?;
    Ok(resp.servers().iter().map(|s| TransferServer {
        id: s.server_id().unwrap_or_default().to_string(),
        state: s.state().map(|st| st.as_str().to_string()).unwrap_or_default(),
        domain: s.domain().map(|d| d.as_str().to_string()).unwrap_or_default(),
        identity_provider_type: s.identity_provider_type().map(|t| t.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn transfer_start_server(profile: String, server_id: String) -> Result<String, String> {
    let client = create_transfer_client(&profile).await;
    client.start_server().server_id(&server_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Server {} starting", server_id))
}

#[tauri::command]
pub async fn transfer_stop_server(profile: String, server_id: String) -> Result<String, String> {
    let client = create_transfer_client(&profile).await;
    client.stop_server().server_id(&server_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Server {} stopping", server_id))
}

#[tauri::command]
pub async fn transfer_delete_server(profile: String, server_id: String) -> Result<String, String> {
    let client = create_transfer_client(&profile).await;
    client.delete_server().server_id(&server_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Server {} deleted", server_id))
}

#[derive(Serialize)]
pub struct TransferUser {
    pub name: String,
    pub home_directory: String,
}

#[tauri::command]
pub async fn transfer_list_users(profile: String, server_id: String) -> Result<Vec<TransferUser>, String> {
    let client = create_transfer_client(&profile).await;
    let resp = client.list_users().server_id(&server_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.users().iter().map(|u| TransferUser {
        name: u.user_name().unwrap_or_default().to_string(),
        home_directory: u.home_directory().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn transfer_delete_user(profile: String, server_id: String, user_name: String) -> Result<String, String> {
    let client = create_transfer_client(&profile).await;
    client.delete_user().server_id(&server_id).user_name(&user_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User {} deleted", user_name))
}
