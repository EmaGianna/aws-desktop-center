use super::load_config;
use aws_sdk_inspector2::Client;
use serde::Serialize;

pub async fn create_inspector2_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Finding {
    pub arn: String,
    pub title: String,
    pub severity: String,
    pub status: String,
}

#[tauri::command]
pub async fn inspector2_list_findings(profile: String) -> Result<Vec<Finding>, String> {
    let client = create_inspector2_client(&profile).await;
    let resp = client.list_findings().send().await.map_err(|e| e.to_string())?;
    Ok(resp.findings().iter().map(|f| Finding {
        arn: f.finding_arn().to_string(),
        title: f.title().unwrap_or_default().to_string(),
        severity: f.severity().as_str().to_string(),
        status: f.status().as_str().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn inspector2_enable(profile: String) -> Result<String, String> {
    let client = create_inspector2_client(&profile).await;
    client.enable()
        .resource_types(aws_sdk_inspector2::types::ResourceScanType::Ec2)
        .resource_types(aws_sdk_inspector2::types::ResourceScanType::Ecr)
        .send().await.map_err(|e| e.to_string())?;
    Ok("Inspector2 enabled for EC2 and ECR".to_string())
}

#[tauri::command]
pub async fn inspector2_disable(profile: String) -> Result<String, String> {
    let client = create_inspector2_client(&profile).await;
    client.disable()
        .resource_types(aws_sdk_inspector2::types::ResourceScanType::Ec2)
        .resource_types(aws_sdk_inspector2::types::ResourceScanType::Ecr)
        .send().await.map_err(|e| e.to_string())?;
    Ok("Inspector2 disabled for EC2 and ECR".to_string())
}
