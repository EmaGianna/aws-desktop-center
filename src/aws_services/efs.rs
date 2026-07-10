use super::load_config;
use aws_sdk_efs::Client;
use serde::Serialize;

pub async fn create_efs_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EfsFileSystem {
    pub id: String,
    pub name: String,
    pub life_cycle_state: String,
    pub size_bytes: i64,
    pub performance_mode: String,
    pub throughput_mode: String,
    pub creation_time: String,
}

#[tauri::command]
pub async fn efs_list_file_systems(profile: String) -> Result<Vec<EfsFileSystem>, String> {
    let client = create_efs_client(&profile).await;
    let resp = client.describe_file_systems().send().await.map_err(|e| e.to_string())?;
    Ok(resp.file_systems().iter().map(|f| EfsFileSystem {
        id: f.file_system_id().to_string(),
        name: f.name().unwrap_or_default().to_string(),
        life_cycle_state: f.life_cycle_state().as_str().to_string(),
        size_bytes: f.size_in_bytes().map(|s| s.value()).unwrap_or(0),
        performance_mode: f.performance_mode().as_str().to_string(),
        throughput_mode: f.throughput_mode().map(|t| t.as_str().to_string()).unwrap_or_default(),
        creation_time: f.creation_time().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn efs_create_file_system(profile: String, performance_mode: String) -> Result<String, String> {
    let client = create_efs_client(&profile).await;
    let mode = aws_sdk_efs::types::PerformanceMode::from(performance_mode.as_str());
    let resp = client.create_file_system().performance_mode(mode).send().await.map_err(|e| e.to_string())?;
    Ok(resp.file_system_id().to_string())
}

#[tauri::command]
pub async fn efs_delete_file_system(profile: String, file_system_id: String) -> Result<String, String> {
    let client = create_efs_client(&profile).await;
    client.delete_file_system().file_system_id(&file_system_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("File system {} deleted", file_system_id))
}

#[derive(Serialize)]
pub struct EfsMountTarget {
    pub id: String,
    pub subnet_id: String,
    pub life_cycle_state: String,
    pub ip_address: String,
}

#[tauri::command]
pub async fn efs_list_mount_targets(profile: String, file_system_id: String) -> Result<Vec<EfsMountTarget>, String> {
    let client = create_efs_client(&profile).await;
    let resp = client.describe_mount_targets().file_system_id(&file_system_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.mount_targets().iter().map(|m| EfsMountTarget {
        id: m.mount_target_id().to_string(),
        subnet_id: m.subnet_id().to_string(),
        life_cycle_state: m.life_cycle_state().as_str().to_string(),
        ip_address: m.ip_address().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn efs_create_mount_target(profile: String, file_system_id: String, subnet_id: String) -> Result<String, String> {
    let client = create_efs_client(&profile).await;
    let resp = client.create_mount_target().file_system_id(&file_system_id).subnet_id(&subnet_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.mount_target_id().to_string())
}

#[tauri::command]
pub async fn efs_delete_mount_target(profile: String, mount_target_id: String) -> Result<String, String> {
    let client = create_efs_client(&profile).await;
    client.delete_mount_target().mount_target_id(&mount_target_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Mount target {} deleted", mount_target_id))
}
