use super::load_config;
use aws_sdk_acm::Client;
use serde::Serialize;

pub async fn create_acm_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Certificate {
    pub arn: String,
    pub domain_name: String,
    pub status: String,
}

#[tauri::command]
pub async fn acm_list_certificates(profile: String) -> Result<Vec<Certificate>, String> {
    let client = create_acm_client(&profile).await;
    let resp = client.list_certificates().send().await.map_err(|e| e.to_string())?;
    Ok(resp.certificate_summary_list().iter().map(|c| Certificate {
        arn: c.certificate_arn().unwrap_or_default().to_string(),
        domain_name: c.domain_name().unwrap_or_default().to_string(),
        status: c.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn acm_request_certificate(profile: String, domain_name: String) -> Result<String, String> {
    let client = create_acm_client(&profile).await;
    let resp = client.request_certificate()
        .domain_name(&domain_name)
        .validation_method(aws_sdk_acm::types::ValidationMethod::Dns)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.certificate_arn().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn acm_delete_certificate(profile: String, certificate_arn: String) -> Result<String, String> {
    let client = create_acm_client(&profile).await;
    client.delete_certificate().certificate_arn(&certificate_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Certificate {} deleted", certificate_arn))
}
