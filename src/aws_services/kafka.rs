use super::load_config;
use aws_sdk_kafka::Client;
use serde::Serialize;

pub async fn create_kafka_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct MskCluster {
    pub arn: String,
    pub name: String,
    pub state: String,
    pub cluster_type: String,
}

#[tauri::command]
pub async fn kafka_list_clusters(profile: String) -> Result<Vec<MskCluster>, String> {
    let client = create_kafka_client(&profile).await;
    let resp = client.list_clusters_v2().send().await.map_err(|e| e.to_string())?;
    Ok(resp.cluster_info_list().iter().map(|c| MskCluster {
        arn: c.cluster_arn().unwrap_or_default().to_string(),
        name: c.cluster_name().unwrap_or_default().to_string(),
        state: c.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
        cluster_type: c.cluster_type().map(|t| t.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct MskNode {
    pub arn: String,
    pub client_subnet: String,
}

#[tauri::command]
pub async fn kafka_list_nodes(profile: String, cluster_arn: String) -> Result<Vec<MskNode>, String> {
    let client = create_kafka_client(&profile).await;
    let resp = client.list_nodes().cluster_arn(&cluster_arn).send().await.map_err(|e| e.to_string())?;
    Ok(resp.node_info_list().iter().map(|n| MskNode {
        arn: n.node_arn().unwrap_or_default().to_string(),
        client_subnet: n.broker_node_info().and_then(|b| b.client_subnet()).unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn kafka_delete_cluster(profile: String, cluster_arn: String) -> Result<String, String> {
    let client = create_kafka_client(&profile).await;
    client.delete_cluster().cluster_arn(&cluster_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Cluster {} deleting", cluster_arn))
}
