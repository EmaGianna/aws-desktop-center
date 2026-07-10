use super::ec2::create_ec2_client;
use serde::Serialize;

#[derive(Serialize)]
pub struct EbsVolume {
    pub id: String,
    pub size_gb: i32,
    pub volume_type: String,
    pub state: String,
    pub availability_zone: String,
    pub encrypted: bool,
    pub attached_instance: String,
    pub device: String,
    pub create_time: String,
}

#[tauri::command]
pub async fn ebs_list_volumes(profile: String) -> Result<Vec<EbsVolume>, String> {
    let client = create_ec2_client(&profile).await;
    let resp = client.describe_volumes().send().await.map_err(|e| e.to_string())?;
    Ok(resp.volumes().iter().map(|v| {
        let attachment = v.attachments().first();
        EbsVolume {
            id: v.volume_id().unwrap_or_default().to_string(),
            size_gb: v.size().unwrap_or(0),
            volume_type: v.volume_type().map(|t| t.as_str().to_string()).unwrap_or_default(),
            state: v.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
            availability_zone: v.availability_zone().unwrap_or_default().to_string(),
            encrypted: v.encrypted().unwrap_or(false),
            attached_instance: attachment.and_then(|a| a.instance_id()).unwrap_or_default().to_string(),
            device: attachment.and_then(|a| a.device()).unwrap_or_default().to_string(),
            create_time: v.create_time().map(|d| d.to_string()).unwrap_or_default(),
        }
    }).collect())
}

#[tauri::command]
pub async fn ebs_create_volume(profile: String, availability_zone: String, size_gb: i32, volume_type: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    let vt = aws_sdk_ec2::types::VolumeType::from(volume_type.as_str());
    let resp = client.create_volume()
        .availability_zone(&availability_zone)
        .size(size_gb)
        .volume_type(vt)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.volume_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn ebs_delete_volume(profile: String, volume_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.delete_volume().volume_id(&volume_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Volume {} deleted", volume_id))
}

#[tauri::command]
pub async fn ebs_attach_volume(profile: String, volume_id: String, instance_id: String, device: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.attach_volume().volume_id(&volume_id).instance_id(&instance_id).device(&device).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Attaching {} to {}", volume_id, instance_id))
}

#[tauri::command]
pub async fn ebs_detach_volume(profile: String, volume_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.detach_volume().volume_id(&volume_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Detaching {}", volume_id))
}

#[derive(Serialize)]
pub struct EbsSnapshot {
    pub id: String,
    pub volume_id: String,
    pub state: String,
    pub progress: String,
    pub volume_size_gb: i32,
    pub description: String,
    pub start_time: String,
}

#[tauri::command]
pub async fn ebs_list_snapshots(profile: String) -> Result<Vec<EbsSnapshot>, String> {
    let client = create_ec2_client(&profile).await;
    let resp = client.describe_snapshots().owner_ids("self").send().await.map_err(|e| e.to_string())?;
    Ok(resp.snapshots().iter().map(|s| EbsSnapshot {
        id: s.snapshot_id().unwrap_or_default().to_string(),
        volume_id: s.volume_id().unwrap_or_default().to_string(),
        state: s.state().map(|st| st.as_str().to_string()).unwrap_or_default(),
        progress: s.progress().unwrap_or_default().to_string(),
        volume_size_gb: s.volume_size().unwrap_or(0),
        description: s.description().unwrap_or_default().to_string(),
        start_time: s.start_time().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn ebs_create_snapshot(profile: String, volume_id: String, description: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    let resp = client.create_snapshot().volume_id(&volume_id).description(&description).send().await.map_err(|e| e.to_string())?;
    Ok(resp.snapshot_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn ebs_delete_snapshot(profile: String, snapshot_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.delete_snapshot().snapshot_id(&snapshot_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Snapshot {} deleted", snapshot_id))
}
