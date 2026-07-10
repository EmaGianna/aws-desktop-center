use super::load_config;
use aws_sdk_neptune::Client;
use serde::Serialize;

pub async fn create_neptune_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct NeptuneCluster {
    pub id: String,
    pub status: String,
    pub engine: String,
    pub engine_version: String,
    pub endpoint: String,
    pub reader_endpoint: String,
    pub port: i32,
}

#[tauri::command]
pub async fn neptune_list_clusters(profile: String) -> Result<Vec<NeptuneCluster>, String> {
    let client = create_neptune_client(&profile).await;
    let resp = client.describe_db_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.db_clusters().iter().map(|c| NeptuneCluster {
        id: c.db_cluster_identifier().unwrap_or_default().to_string(),
        status: c.status().unwrap_or_default().to_string(),
        engine: c.engine().unwrap_or_default().to_string(),
        engine_version: c.engine_version().unwrap_or_default().to_string(),
        endpoint: c.endpoint().unwrap_or_default().to_string(),
        reader_endpoint: c.reader_endpoint().unwrap_or_default().to_string(),
        port: c.port().unwrap_or(0),
    }).collect())
}

#[derive(Serialize)]
pub struct NeptuneInstance {
    pub id: String,
    pub status: String,
    pub instance_class: String,
    pub cluster_id: String,
}

#[tauri::command]
pub async fn neptune_list_instances(profile: String) -> Result<Vec<NeptuneInstance>, String> {
    let client = create_neptune_client(&profile).await;
    let resp = client.describe_db_instances().send().await.map_err(|e| e.to_string())?;
    Ok(resp.db_instances().iter().map(|i| NeptuneInstance {
        id: i.db_instance_identifier().unwrap_or_default().to_string(),
        status: i.db_instance_status().unwrap_or_default().to_string(),
        instance_class: i.db_instance_class().unwrap_or_default().to_string(),
        cluster_id: i.db_cluster_identifier().unwrap_or_default().to_string(),
    }).collect())
}
