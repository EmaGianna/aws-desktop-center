use super::load_config;
use aws_sdk_cognitoidentityprovider::Client;
use serde::Serialize;

pub async fn create_cognito_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct UserPool {
    pub id: String,
    pub name: String,
    pub creation_date: String,
}

#[tauri::command]
pub async fn cognito_list_user_pools(profile: String) -> Result<Vec<UserPool>, String> {
    let client = create_cognito_client(&profile).await;
    let resp = client.list_user_pools().max_results(60).send().await.map_err(|e| e.to_string())?;
    Ok(resp.user_pools().iter().map(|p| UserPool {
        id: p.id().unwrap_or_default().to_string(),
        name: p.name().unwrap_or_default().to_string(),
        creation_date: p.creation_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn cognito_create_user_pool(profile: String, pool_name: String) -> Result<String, String> {
    let client = create_cognito_client(&profile).await;
    let resp = client.create_user_pool().pool_name(&pool_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.user_pool().and_then(|p| p.id()).unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn cognito_delete_user_pool(profile: String, user_pool_id: String) -> Result<String, String> {
    let client = create_cognito_client(&profile).await;
    client.delete_user_pool().user_pool_id(&user_pool_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User pool {} deleted", user_pool_id))
}

#[derive(Serialize)]
pub struct CognitoUser {
    pub username: String,
    pub status: String,
    pub enabled: bool,
    pub create_date: String,
}

#[tauri::command]
pub async fn cognito_list_users(profile: String, user_pool_id: String) -> Result<Vec<CognitoUser>, String> {
    let client = create_cognito_client(&profile).await;
    let resp = client.list_users().user_pool_id(&user_pool_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.users().iter().map(|u| CognitoUser {
        username: u.username().unwrap_or_default().to_string(),
        status: u.user_status().map(|s| s.as_str().to_string()).unwrap_or_default(),
        enabled: u.enabled(),
        create_date: u.user_create_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn cognito_enable_user(profile: String, user_pool_id: String, username: String) -> Result<String, String> {
    let client = create_cognito_client(&profile).await;
    client.admin_enable_user().user_pool_id(&user_pool_id).username(&username).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User {} enabled", username))
}

#[tauri::command]
pub async fn cognito_disable_user(profile: String, user_pool_id: String, username: String) -> Result<String, String> {
    let client = create_cognito_client(&profile).await;
    client.admin_disable_user().user_pool_id(&user_pool_id).username(&username).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User {} disabled", username))
}

#[tauri::command]
pub async fn cognito_delete_user(profile: String, user_pool_id: String, username: String) -> Result<String, String> {
    let client = create_cognito_client(&profile).await;
    client.admin_delete_user().user_pool_id(&user_pool_id).username(&username).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User {} deleted", username))
}
