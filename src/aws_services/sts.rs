use super::load_config;
use aws_sdk_sts::Client;
use serde::Serialize;

pub async fn create_sts_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct CallerIdentity {
    pub account: String,
    pub arn: String,
    pub user_id: String,
}

#[tauri::command]
pub async fn sts_get_caller_identity(profile: String) -> Result<CallerIdentity, String> {
    let client = create_sts_client(&profile).await;
    let resp = client.get_caller_identity().send().await.map_err(|e| e.to_string())?;
    Ok(CallerIdentity {
        account: resp.account().unwrap_or_default().to_string(),
        arn: resp.arn().unwrap_or_default().to_string(),
        user_id: resp.user_id().unwrap_or_default().to_string(),
    })
}

#[derive(Serialize)]
pub struct TemporaryCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub session_token: String,
    pub expiration: String,
}

#[tauri::command]
pub async fn sts_assume_role(profile: String, role_arn: String, session_name: String) -> Result<TemporaryCredentials, String> {
    let client = create_sts_client(&profile).await;
    let resp = client.assume_role().role_arn(&role_arn).role_session_name(&session_name).send().await.map_err(|e| e.to_string())?;
    let creds = resp.credentials().ok_or("No credentials returned")?;
    Ok(TemporaryCredentials {
        access_key_id: creds.access_key_id().to_string(),
        secret_access_key: creds.secret_access_key().to_string(),
        session_token: creds.session_token().to_string(),
        expiration: creds.expiration().to_string(),
    })
}

#[tauri::command]
pub async fn sts_get_session_token(profile: String, duration_seconds: i32) -> Result<TemporaryCredentials, String> {
    let client = create_sts_client(&profile).await;
    let resp = client.get_session_token().duration_seconds(duration_seconds).send().await.map_err(|e| e.to_string())?;
    let creds = resp.credentials().ok_or("No credentials returned")?;
    Ok(TemporaryCredentials {
        access_key_id: creds.access_key_id().to_string(),
        secret_access_key: creds.secret_access_key().to_string(),
        session_token: creds.session_token().to_string(),
        expiration: creds.expiration().to_string(),
    })
}
