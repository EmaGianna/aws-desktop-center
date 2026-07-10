use super::load_config;
use aws_sdk_sesv2::types::{Body, Content, Destination, EmailContent, Message};
use aws_sdk_sesv2::Client;
use serde::Serialize;

pub async fn create_sesv2_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EmailIdentity {
    pub name: String,
    pub identity_type: String,
    pub sending_enabled: bool,
    pub verification_status: String,
}

#[tauri::command]
pub async fn ses_list_identities(profile: String) -> Result<Vec<EmailIdentity>, String> {
    let client = create_sesv2_client(&profile).await;
    let resp = client.list_email_identities().send().await.map_err(|e| e.to_string())?;
    Ok(resp.email_identities().iter().map(|i| EmailIdentity {
        name: i.identity_name().unwrap_or_default().to_string(),
        identity_type: i.identity_type().map(|t| t.as_str().to_string()).unwrap_or_default(),
        sending_enabled: i.sending_enabled(),
        verification_status: i.verification_status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn ses_create_identity(profile: String, email_identity: String) -> Result<String, String> {
    let client = create_sesv2_client(&profile).await;
    client.create_email_identity().email_identity(&email_identity).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Identity {} created (check inbox to verify)", email_identity))
}

#[tauri::command]
pub async fn ses_delete_identity(profile: String, email_identity: String) -> Result<String, String> {
    let client = create_sesv2_client(&profile).await;
    client.delete_email_identity().email_identity(&email_identity).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Identity {} deleted", email_identity))
}

#[tauri::command]
pub async fn ses_send_email(profile: String, from_email: String, to_email: String, subject: String, body: String) -> Result<String, String> {
    let client = create_sesv2_client(&profile).await;
    let content = EmailContent::builder()
        .simple(Message::builder()
            .subject(Content::builder().data(&subject).build().map_err(|e| e.to_string())?)
            .body(Body::builder()
                .text(Content::builder().data(&body).build().map_err(|e| e.to_string())?)
                .build())
            .build())
        .build();
    let destination = Destination::builder().to_addresses(&to_email).build();
    let resp = client.send_email()
        .from_email_address(&from_email)
        .destination(destination)
        .content(content)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.message_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn ses_list_configuration_sets(profile: String) -> Result<Vec<String>, String> {
    let client = create_sesv2_client(&profile).await;
    let resp = client.list_configuration_sets().send().await.map_err(|e| e.to_string())?;
    Ok(resp.configuration_sets().to_vec())
}
