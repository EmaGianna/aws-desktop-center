use super::load_config;
use aws_sdk_elasticache::Client;
use serde::Serialize;

pub async fn create_elasticache_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct CacheCluster {
    pub id: String,
    pub engine: String,
    pub engine_version: String,
    pub node_type: String,
    pub status: String,
    pub num_nodes: i32,
}

#[tauri::command]
pub async fn elasticache_list_clusters(profile: String) -> Result<Vec<CacheCluster>, String> {
    let client = create_elasticache_client(&profile).await;
    let resp = client.describe_cache_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.cache_clusters().iter().map(|c| CacheCluster {
        id: c.cache_cluster_id().unwrap_or_default().to_string(),
        engine: c.engine().unwrap_or_default().to_string(),
        engine_version: c.engine_version().unwrap_or_default().to_string(),
        node_type: c.cache_node_type().unwrap_or_default().to_string(),
        status: c.cache_cluster_status().unwrap_or_default().to_string(),
        num_nodes: c.num_cache_nodes().unwrap_or(0),
    }).collect())
}

#[tauri::command]
pub async fn elasticache_create_cluster(profile: String, cluster_id: String, engine: String, node_type: String, num_nodes: i32) -> Result<String, String> {
    let client = create_elasticache_client(&profile).await;
    client.create_cache_cluster()
        .cache_cluster_id(&cluster_id)
        .engine(&engine)
        .cache_node_type(&node_type)
        .num_cache_nodes(num_nodes)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} creating", cluster_id))
}

#[tauri::command]
pub async fn elasticache_delete_cluster(profile: String, cluster_id: String) -> Result<String, String> {
    let client = create_elasticache_client(&profile).await;
    client.delete_cache_cluster().cache_cluster_id(&cluster_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} deleting", cluster_id))
}
