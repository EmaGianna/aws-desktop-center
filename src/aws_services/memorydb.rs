use super::load_config;
use aws_sdk_memorydb::Client;
use serde::Serialize;

pub async fn create_memorydb_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct MemoryDbCluster {
    pub name: String,
    pub status: String,
    pub node_type: String,
    pub num_shards: i32,
}

#[tauri::command]
pub async fn memorydb_list_clusters(profile: String) -> Result<Vec<MemoryDbCluster>, String> {
    let client = create_memorydb_client(&profile).await;
    let resp = client.describe_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.clusters().iter().map(|c| MemoryDbCluster {
        name: c.name().unwrap_or_default().to_string(),
        status: c.status().unwrap_or_default().to_string(),
        node_type: c.node_type().unwrap_or_default().to_string(),
        num_shards: c.number_of_shards().unwrap_or(0),
    }).collect())
}

#[tauri::command]
pub async fn memorydb_create_cluster(profile: String, cluster_name: String, node_type: String, acl_name: String) -> Result<String, String> {
    let client = create_memorydb_client(&profile).await;
    client.create_cluster()
        .cluster_name(&cluster_name)
        .node_type(&node_type)
        .acl_name(&acl_name)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} creating", cluster_name))
}

#[tauri::command]
pub async fn memorydb_delete_cluster(profile: String, cluster_name: String) -> Result<String, String> {
    let client = create_memorydb_client(&profile).await;
    client.delete_cluster().cluster_name(&cluster_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} deleting", cluster_name))
}
