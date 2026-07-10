use super::load_config;
use aws_sdk_autoscaling::Client;
use serde::Serialize;

pub async fn create_autoscaling_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct AutoScalingGroup {
    pub name: String,
    pub min_size: i32,
    pub max_size: i32,
    pub desired_capacity: i32,
    pub instance_count: usize,
}

#[tauri::command]
pub async fn asg_list_groups(profile: String) -> Result<Vec<AutoScalingGroup>, String> {
    let client = create_autoscaling_client(&profile).await;
    let resp = client.describe_auto_scaling_groups().send().await.map_err(|e| e.to_string())?;
    Ok(resp.auto_scaling_groups().iter().map(|g| AutoScalingGroup {
        name: g.auto_scaling_group_name().unwrap_or_default().to_string(),
        min_size: g.min_size().unwrap_or(0),
        max_size: g.max_size().unwrap_or(0),
        desired_capacity: g.desired_capacity().unwrap_or(0),
        instance_count: g.instances().len(),
    }).collect())
}

#[tauri::command]
pub async fn asg_update_desired_capacity(profile: String, group_name: String, desired_capacity: i32) -> Result<String, String> {
    let client = create_autoscaling_client(&profile).await;
    client.update_auto_scaling_group().auto_scaling_group_name(&group_name).desired_capacity(desired_capacity).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Group {} desired capacity set to {}", group_name, desired_capacity))
}

#[tauri::command]
pub async fn asg_delete_group(profile: String, group_name: String) -> Result<String, String> {
    let client = create_autoscaling_client(&profile).await;
    client.delete_auto_scaling_group().auto_scaling_group_name(&group_name).force_delete(true).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Group {} deleting", group_name))
}
