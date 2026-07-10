use super::load_config;
use aws_sdk_docdb::Client;
use serde::Serialize;

pub async fn create_docdb_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct DocDbCluster {
    pub id: String,
    pub status: String,
    pub engine: String,
    pub engine_version: String,
    pub endpoint: String,
    pub port: i32,
}

#[tauri::command]
pub async fn docdb_list_clusters(profile: String) -> Result<Vec<DocDbCluster>, String> {
    let client = create_docdb_client(&profile).await;
    let resp = client.describe_db_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.db_clusters().iter().map(|c| DocDbCluster {
        id: c.db_cluster_identifier().unwrap_or_default().to_string(),
        status: c.status().unwrap_or_default().to_string(),
        engine: c.engine().unwrap_or_default().to_string(),
        engine_version: c.engine_version().unwrap_or_default().to_string(),
        endpoint: c.endpoint().unwrap_or_default().to_string(),
        port: c.port().unwrap_or(0),
    }).collect())
}

#[tauri::command]
pub async fn docdb_start_cluster(profile: String, cluster_id: String) -> Result<String, String> {
    let client = create_docdb_client(&profile).await;
    client.start_db_cluster().db_cluster_identifier(&cluster_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} starting", cluster_id))
}

#[tauri::command]
pub async fn docdb_stop_cluster(profile: String, cluster_id: String) -> Result<String, String> {
    let client = create_docdb_client(&profile).await;
    client.stop_db_cluster().db_cluster_identifier(&cluster_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} stopping", cluster_id))
}
