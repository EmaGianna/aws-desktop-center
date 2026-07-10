use super::load_config;
use aws_sdk_codedeploy::Client;
use serde::Serialize;

pub async fn create_codedeploy_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[tauri::command]
pub async fn codedeploy_list_applications(profile: String) -> Result<Vec<String>, String> {
    let client = create_codedeploy_client(&profile).await;
    let resp = client.list_applications().send().await.map_err(|e| e.to_string())?;
    Ok(resp.applications().to_vec())
}

#[tauri::command]
pub async fn codedeploy_list_deployment_groups(profile: String, application_name: String) -> Result<Vec<String>, String> {
    let client = create_codedeploy_client(&profile).await;
    let resp = client.list_deployment_groups().application_name(&application_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.deployment_groups().to_vec())
}

#[derive(Serialize)]
pub struct Deployment {
    pub id: String,
    pub status: String,
    pub create_time: String,
}

#[tauri::command]
pub async fn codedeploy_list_deployments(profile: String, application_name: String, deployment_group_name: String) -> Result<Vec<Deployment>, String> {
    let client = create_codedeploy_client(&profile).await;
    let ids_resp = client.list_deployments()
        .application_name(&application_name)
        .deployment_group_name(&deployment_group_name)
        .send().await.map_err(|e| e.to_string())?;

    let mut deployments = Vec::new();
    for id in ids_resp.deployments() {
        let detail = client.get_deployment().deployment_id(id).send().await.map_err(|e| e.to_string())?;
        if let Some(info) = detail.deployment_info() {
            deployments.push(Deployment {
                id: id.clone(),
                status: info.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
                create_time: info.create_time().map(|d| d.to_string()).unwrap_or_default(),
            });
        }
    }
    Ok(deployments)
}

#[tauri::command]
pub async fn codedeploy_stop_deployment(profile: String, deployment_id: String) -> Result<String, String> {
    let client = create_codedeploy_client(&profile).await;
    client.stop_deployment().deployment_id(&deployment_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Deployment {} stopped", deployment_id))
}
