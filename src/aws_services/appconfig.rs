use super::load_config;
use aws_sdk_appconfig::Client;
use serde::Serialize;

pub async fn create_appconfig_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct AppConfigApplication {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[tauri::command]
pub async fn appconfig_list_applications(profile: String) -> Result<Vec<AppConfigApplication>, String> {
    let client = create_appconfig_client(&profile).await;
    let resp = client.list_applications().send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|a| AppConfigApplication {
        id: a.id().unwrap_or_default().to_string(),
        name: a.name().unwrap_or_default().to_string(),
        description: a.description().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct AppConfigEnvironment {
    pub id: String,
    pub name: String,
    pub state: String,
}

#[tauri::command]
pub async fn appconfig_list_environments(profile: String, application_id: String) -> Result<Vec<AppConfigEnvironment>, String> {
    let client = create_appconfig_client(&profile).await;
    let resp = client.list_environments().application_id(&application_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|e| AppConfigEnvironment {
        id: e.id().unwrap_or_default().to_string(),
        name: e.name().unwrap_or_default().to_string(),
        state: e.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct AppConfigProfile {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn appconfig_list_profiles(profile: String, application_id: String) -> Result<Vec<AppConfigProfile>, String> {
    let client = create_appconfig_client(&profile).await;
    let resp = client.list_configuration_profiles().application_id(&application_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|p| AppConfigProfile {
        id: p.id().unwrap_or_default().to_string(),
        name: p.name().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct AppConfigDeployment {
    pub number: i32,
    pub state: String,
}

#[tauri::command]
pub async fn appconfig_list_deployments(profile: String, application_id: String, environment_id: String) -> Result<Vec<AppConfigDeployment>, String> {
    let client = create_appconfig_client(&profile).await;
    let resp = client.list_deployments().application_id(&application_id).environment_id(&environment_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|d| AppConfigDeployment {
        number: d.deployment_number(),
        state: d.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}
