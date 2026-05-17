use super::load_config;
use aws_sdk_rds::Client;
use serde::Serialize;

#[derive(Serialize)]
pub struct DbInstance {
    pub id: String,
    pub engine: String,
    pub engine_version: String,
    pub class: String,
    pub status: String,
    pub endpoint: String,
    pub port: i32,
    pub storage_gb: i32,
    pub storage_type: String,
    pub multi_az: bool,
    pub vpc_id: String,
    pub backup_retention: i32,
    pub availability_zone: String,
    pub cluster_id: String,
}

#[derive(Serialize)]
pub struct DbCluster {
    pub id: String,
    pub engine: String,
    pub engine_version: String,
    pub status: String,
    pub endpoint: String,
    pub reader_endpoint: String,
    pub port: i32,
    pub multi_az: bool,
    pub members: Vec<ClusterMember>,
    pub storage_encrypted: bool,
    pub backup_retention: i32,
}

#[derive(Serialize)]
pub struct ClusterMember {
    pub instance_id: String,
    pub is_writer: bool,
}

#[derive(Serialize)]
pub struct DbSnapshot {
    pub id: String,
    pub instance_id: String,
    pub snapshot_type: String,
    pub status: String,
    pub created: String,
    pub storage_gb: i32,
    pub engine: String,
}

#[tauri::command]
pub async fn rds_list_instances(profile: String) -> Result<Vec<DbInstance>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.describe_db_instances().send().await.map_err(|e| e.to_string())?;
    Ok(resp.db_instances().iter().map(|i| {
        let endpoint = i.endpoint();
        DbInstance {
            id: i.db_instance_identifier().unwrap_or_default().to_string(),
            engine: i.engine().unwrap_or_default().to_string(),
            engine_version: i.engine_version().unwrap_or_default().to_string(),
            class: i.db_instance_class().unwrap_or_default().to_string(),
            status: i.db_instance_status().unwrap_or_default().to_string(),
            endpoint: endpoint.map(|e| e.address().unwrap_or_default().to_string()).unwrap_or_default(),
            port: endpoint.and_then(|e| e.port()).unwrap_or(0),
            storage_gb: i.allocated_storage().unwrap_or(0),
            storage_type: i.storage_type().unwrap_or_default().to_string(),
            multi_az: i.multi_az().unwrap_or(false),
            vpc_id: i.db_subnet_group().and_then(|s| s.vpc_id()).unwrap_or_default().to_string(),
            backup_retention: i.backup_retention_period().unwrap_or(0),
            availability_zone: i.availability_zone().unwrap_or_default().to_string(),
            cluster_id: i.db_cluster_identifier().unwrap_or_default().to_string(),
        }
    }).collect())
}

#[tauri::command]
pub async fn rds_list_clusters(profile: String) -> Result<Vec<DbCluster>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.describe_db_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.db_clusters().iter().map(|c| {
        let members: Vec<ClusterMember> = c.db_cluster_members().iter().map(|m| ClusterMember {
            instance_id: m.db_instance_identifier().unwrap_or_default().to_string(),
            is_writer: m.is_cluster_writer().unwrap_or(false),
        }).collect();
        DbCluster {
            id: c.db_cluster_identifier().unwrap_or_default().to_string(),
            engine: c.engine().unwrap_or_default().to_string(),
            engine_version: c.engine_version().unwrap_or_default().to_string(),
            status: c.status().unwrap_or_default().to_string(),
            endpoint: c.endpoint().unwrap_or_default().to_string(),
            reader_endpoint: c.reader_endpoint().unwrap_or_default().to_string(),
            port: c.port().unwrap_or(0),
            multi_az: c.multi_az().unwrap_or(false),
            members,
            storage_encrypted: c.storage_encrypted().unwrap_or(false),
            backup_retention: c.backup_retention_period().unwrap_or(0),
        }
    }).collect())
}

#[tauri::command]
pub async fn rds_list_snapshots(profile: String, instance_id: String) -> Result<Vec<DbSnapshot>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let mut req = client.describe_db_snapshots();
    if !instance_id.is_empty() {
        req = req.db_instance_identifier(&instance_id);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.db_snapshots().iter().map(|s| DbSnapshot {
        id: s.db_snapshot_identifier().unwrap_or_default().to_string(),
        instance_id: s.db_instance_identifier().unwrap_or_default().to_string(),
        snapshot_type: s.snapshot_type().unwrap_or_default().to_string(),
        status: s.status().unwrap_or_default().to_string(),
        created: s.snapshot_create_time().map(|d| d.to_string()).unwrap_or_default(),
        storage_gb: s.allocated_storage().unwrap_or(0),
        engine: s.engine().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn rds_stop_instance(profile: String, instance_id: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.stop_db_instance().db_instance_identifier(&instance_id)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Stopping instance {}", instance_id))
}

#[tauri::command]
pub async fn rds_start_instance(profile: String, instance_id: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.start_db_instance().db_instance_identifier(&instance_id)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Starting instance {}", instance_id))
}
