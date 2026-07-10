use super::load_config;
use aws_sdk_backup::Client;
use serde::Serialize;

pub async fn create_backup_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct BackupVault {
    pub name: String,
    pub arn: String,
    pub recovery_points: i64,
    pub creation_date: String,
}

#[tauri::command]
pub async fn backup_list_vaults(profile: String) -> Result<Vec<BackupVault>, String> {
    let client = create_backup_client(&profile).await;
    let resp = client.list_backup_vaults().send().await.map_err(|e| e.to_string())?;
    Ok(resp.backup_vault_list().iter().map(|v| BackupVault {
        name: v.backup_vault_name().unwrap_or_default().to_string(),
        arn: v.backup_vault_arn().unwrap_or_default().to_string(),
        recovery_points: v.number_of_recovery_points(),
        creation_date: v.creation_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct BackupPlan {
    pub id: String,
    pub name: String,
    pub arn: String,
    pub creation_date: String,
}

#[tauri::command]
pub async fn backup_list_plans(profile: String) -> Result<Vec<BackupPlan>, String> {
    let client = create_backup_client(&profile).await;
    let resp = client.list_backup_plans().send().await.map_err(|e| e.to_string())?;
    Ok(resp.backup_plans_list().iter().map(|p| BackupPlan {
        id: p.backup_plan_id().unwrap_or_default().to_string(),
        name: p.backup_plan_name().unwrap_or_default().to_string(),
        arn: p.backup_plan_arn().unwrap_or_default().to_string(),
        creation_date: p.creation_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct RecoveryPoint {
    pub arn: String,
    pub resource_type: String,
    pub status: String,
    pub creation_date: String,
    pub backup_size_bytes: i64,
}

#[tauri::command]
pub async fn backup_list_recovery_points(profile: String, backup_vault_name: String) -> Result<Vec<RecoveryPoint>, String> {
    let client = create_backup_client(&profile).await;
    let resp = client.list_recovery_points_by_backup_vault().backup_vault_name(&backup_vault_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.recovery_points().iter().map(|r| RecoveryPoint {
        arn: r.recovery_point_arn().unwrap_or_default().to_string(),
        resource_type: r.resource_type().unwrap_or_default().to_string(),
        status: r.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
        creation_date: r.creation_date().map(|d| d.to_string()).unwrap_or_default(),
        backup_size_bytes: r.backup_size_in_bytes().unwrap_or(0),
    }).collect())
}

#[tauri::command]
pub async fn backup_start_job(profile: String, backup_vault_name: String, resource_arn: String, iam_role_arn: String) -> Result<String, String> {
    let client = create_backup_client(&profile).await;
    let resp = client.start_backup_job()
        .backup_vault_name(&backup_vault_name)
        .resource_arn(&resource_arn)
        .iam_role_arn(&iam_role_arn)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.backup_job_id().unwrap_or_default().to_string())
}
