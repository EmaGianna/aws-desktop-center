use super::load_config;
use aws_sdk_ecs::Client;
use serde::Serialize;

pub async fn create_ecs_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EcsCluster {
    pub name: String,
    pub arn: String,
    pub status: String,
    pub running_tasks: i32,
    pub pending_tasks: i32,
    pub active_services: i32,
}

#[tauri::command]
pub async fn ecs_list_clusters(profile: String) -> Result<Vec<EcsCluster>, String> {
    let client = create_ecs_client(&profile).await;
    let arns_resp = client.list_clusters().send().await.map_err(|e| e.to_string())?;
    let arns: Vec<String> = arns_resp.cluster_arns().to_vec();
    if arns.is_empty() {
        return Ok(Vec::new());
    }
    let resp = client.describe_clusters().set_clusters(Some(arns)).send().await.map_err(|e| e.to_string())?;
    Ok(resp.clusters().iter().map(|c| EcsCluster {
        name: c.cluster_name().unwrap_or_default().to_string(),
        arn: c.cluster_arn().unwrap_or_default().to_string(),
        status: c.status().unwrap_or_default().to_string(),
        running_tasks: c.running_tasks_count(),
        pending_tasks: c.pending_tasks_count(),
        active_services: c.active_services_count(),
    }).collect())
}

#[derive(Serialize)]
pub struct EcsService {
    pub name: String,
    pub status: String,
    pub desired_count: i32,
    pub running_count: i32,
    pub pending_count: i32,
    pub task_definition: String,
}

#[tauri::command]
pub async fn ecs_list_services(profile: String, cluster: String) -> Result<Vec<EcsService>, String> {
    let client = create_ecs_client(&profile).await;
    let arns_resp = client.list_services().cluster(&cluster).send().await.map_err(|e| e.to_string())?;
    let arns: Vec<String> = arns_resp.service_arns().to_vec();
    if arns.is_empty() {
        return Ok(Vec::new());
    }
    let resp = client.describe_services().cluster(&cluster).set_services(Some(arns)).send().await.map_err(|e| e.to_string())?;
    Ok(resp.services().iter().map(|s| EcsService {
        name: s.service_name().unwrap_or_default().to_string(),
        status: s.status().unwrap_or_default().to_string(),
        desired_count: s.desired_count(),
        running_count: s.running_count(),
        pending_count: s.pending_count(),
        task_definition: s.task_definition().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct EcsTask {
    pub arn: String,
    pub last_status: String,
    pub desired_status: String,
    pub cpu: String,
    pub memory: String,
    pub task_definition_arn: String,
}

#[tauri::command]
pub async fn ecs_list_tasks(profile: String, cluster: String) -> Result<Vec<EcsTask>, String> {
    let client = create_ecs_client(&profile).await;
    let arns_resp = client.list_tasks().cluster(&cluster).send().await.map_err(|e| e.to_string())?;
    let arns: Vec<String> = arns_resp.task_arns().to_vec();
    if arns.is_empty() {
        return Ok(Vec::new());
    }
    let resp = client.describe_tasks().cluster(&cluster).set_tasks(Some(arns)).send().await.map_err(|e| e.to_string())?;
    Ok(resp.tasks().iter().map(|t| EcsTask {
        arn: t.task_arn().unwrap_or_default().to_string(),
        last_status: t.last_status().unwrap_or_default().to_string(),
        desired_status: t.desired_status().unwrap_or_default().to_string(),
        cpu: t.cpu().unwrap_or_default().to_string(),
        memory: t.memory().unwrap_or_default().to_string(),
        task_definition_arn: t.task_definition_arn().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn ecs_stop_task(profile: String, cluster: String, task: String) -> Result<String, String> {
    let client = create_ecs_client(&profile).await;
    client.stop_task().cluster(&cluster).task(&task).reason("Stopped from aws-desktop-center").send().await.map_err(|e| e.to_string())?;
    Ok(format!("Stopping task {}", task))
}

#[tauri::command]
pub async fn ecs_update_service_desired_count(profile: String, cluster: String, service: String, desired_count: i32) -> Result<String, String> {
    let client = create_ecs_client(&profile).await;
    client.update_service().cluster(&cluster).service(&service).desired_count(desired_count).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Service {} desired count set to {}", service, desired_count))
}
