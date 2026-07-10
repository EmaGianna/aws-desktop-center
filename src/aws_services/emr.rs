use super::load_config;
use aws_sdk_emr::Client;
use serde::Serialize;

pub async fn create_emr_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EmrCluster {
    pub id: String,
    pub name: String,
    pub state: String,
}

#[tauri::command]
pub async fn emr_list_clusters(profile: String) -> Result<Vec<EmrCluster>, String> {
    let client = create_emr_client(&profile).await;
    let resp = client.list_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.clusters().iter().map(|c| EmrCluster {
        id: c.id().unwrap_or_default().to_string(),
        name: c.name().unwrap_or_default().to_string(),
        state: c.status().and_then(|s| s.state()).map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct EmrStep {
    pub id: String,
    pub name: String,
    pub state: String,
}

#[tauri::command]
pub async fn emr_list_steps(profile: String, cluster_id: String) -> Result<Vec<EmrStep>, String> {
    let client = create_emr_client(&profile).await;
    let resp = client.list_steps().cluster_id(&cluster_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.steps().iter().map(|s| EmrStep {
        id: s.id().unwrap_or_default().to_string(),
        name: s.name().unwrap_or_default().to_string(),
        state: s.status().and_then(|st| st.state()).map(|st| st.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn emr_terminate_cluster(profile: String, cluster_id: String) -> Result<String, String> {
    let client = create_emr_client(&profile).await;
    client.terminate_job_flows().job_flow_ids(&cluster_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} terminating", cluster_id))
}
