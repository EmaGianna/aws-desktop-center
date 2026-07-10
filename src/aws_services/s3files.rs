use super::load_config;
use aws_sdk_s3files::Client;
use serde::Serialize;

pub async fn create_s3files_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct S3FileSystem {
    pub id: String,
    pub arn: String,
    pub life_cycle_state: String,
    pub creation_time: String,
}

#[tauri::command]
pub async fn s3files_list_file_systems(profile: String) -> Result<Vec<S3FileSystem>, String> {
    let client = create_s3files_client(&profile).await;
    let resp = client.list_file_systems().send().await.map_err(|e| e.to_string())?;
    Ok(resp.file_systems().iter().map(|f| S3FileSystem {
        id: f.file_system_id().to_string(),
        arn: f.file_system_arn().to_string(),
        life_cycle_state: f.status().as_str().to_string(),
        creation_time: f.creation_time().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn s3files_create_file_system(profile: String) -> Result<String, String> {
    let client = create_s3files_client(&profile).await;
    let resp = client.create_file_system().send().await.map_err(|e| e.to_string())?;
    Ok(resp.file_system_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn s3files_delete_file_system(profile: String, file_system_id: String) -> Result<String, String> {
    let client = create_s3files_client(&profile).await;
    client.delete_file_system().file_system_id(&file_system_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("File system {} deleted", file_system_id))
}

#[derive(Serialize)]
pub struct S3MountTarget {
    pub id: String,
    pub subnet_id: String,
    pub life_cycle_state: String,
}

#[tauri::command]
pub async fn s3files_list_mount_targets(profile: String, file_system_id: String) -> Result<Vec<S3MountTarget>, String> {
    let client = create_s3files_client(&profile).await;
    let resp = client.list_mount_targets().file_system_id(&file_system_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.mount_targets().iter().map(|m| S3MountTarget {
        id: m.mount_target_id().to_string(),
        subnet_id: m.subnet_id().to_string(),
        life_cycle_state: m.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn s3files_create_mount_target(profile: String, file_system_id: String, subnet_id: String) -> Result<String, String> {
    let client = create_s3files_client(&profile).await;
    let resp = client.create_mount_target().file_system_id(&file_system_id).subnet_id(&subnet_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.mount_target_id().to_string())
}

#[tauri::command]
pub async fn s3files_delete_mount_target(profile: String, mount_target_id: String) -> Result<String, String> {
    let client = create_s3files_client(&profile).await;
    client.delete_mount_target().mount_target_id(&mount_target_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Mount target {} deleted", mount_target_id))
}
