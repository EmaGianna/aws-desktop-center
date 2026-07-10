use super::load_config;
use aws_sdk_elasticbeanstalk::Client;
use serde::Serialize;

pub async fn create_eb_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EbApplication {
    pub name: String,
    pub description: String,
    pub date_created: String,
    pub versions: Vec<String>,
}

#[tauri::command]
pub async fn eb_list_applications(profile: String) -> Result<Vec<EbApplication>, String> {
    let client = create_eb_client(&profile).await;
    let resp = client.describe_applications().send().await.map_err(|e| e.to_string())?;
    Ok(resp.applications().iter().map(|a| EbApplication {
        name: a.application_name().unwrap_or_default().to_string(),
        description: a.description().unwrap_or_default().to_string(),
        date_created: a.date_created().map(|d| d.to_string()).unwrap_or_default(),
        versions: a.versions().to_vec(),
    }).collect())
}

#[derive(Serialize)]
pub struct EbEnvironment {
    pub name: String,
    pub id: String,
    pub status: String,
    pub health: String,
    pub cname: String,
    pub version_label: String,
    pub solution_stack_name: String,
}

#[tauri::command]
pub async fn eb_list_environments(profile: String, application_name: String) -> Result<Vec<EbEnvironment>, String> {
    let client = create_eb_client(&profile).await;
    let mut req = client.describe_environments();
    if !application_name.is_empty() {
        req = req.application_name(&application_name);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.environments().iter().map(|e| EbEnvironment {
        name: e.environment_name().unwrap_or_default().to_string(),
        id: e.environment_id().unwrap_or_default().to_string(),
        status: e.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
        health: e.health().map(|h| h.as_str().to_string()).unwrap_or_default(),
        cname: e.cname().unwrap_or_default().to_string(),
        version_label: e.version_label().unwrap_or_default().to_string(),
        solution_stack_name: e.solution_stack_name().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn eb_restart_environment(profile: String, environment_name: String) -> Result<String, String> {
    let client = create_eb_client(&profile).await;
    client.restart_app_server().environment_name(&environment_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Restarting app server for {}", environment_name))
}
