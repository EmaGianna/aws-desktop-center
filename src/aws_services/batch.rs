use super::load_config;
use aws_sdk_batch::Client;
use serde::Serialize;

pub async fn create_batch_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct ComputeEnvironment {
    pub name: String,
    pub state: String,
    pub status: String,
}

#[tauri::command]
pub async fn batch_list_compute_environments(profile: String) -> Result<Vec<ComputeEnvironment>, String> {
    let client = create_batch_client(&profile).await;
    let resp = client.describe_compute_environments().send().await.map_err(|e| e.to_string())?;
    Ok(resp.compute_environments().iter().map(|c| ComputeEnvironment {
        name: c.compute_environment_name().unwrap_or_default().to_string(),
        state: c.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
        status: c.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct JobQueue {
    pub name: String,
    pub state: String,
    pub status: String,
    pub priority: i32,
}

#[tauri::command]
pub async fn batch_list_job_queues(profile: String) -> Result<Vec<JobQueue>, String> {
    let client = create_batch_client(&profile).await;
    let resp = client.describe_job_queues().send().await.map_err(|e| e.to_string())?;
    Ok(resp.job_queues().iter().map(|q| JobQueue {
        name: q.job_queue_name().unwrap_or_default().to_string(),
        state: q.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
        status: q.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
        priority: q.priority().unwrap_or(0),
    }).collect())
}

#[derive(Serialize)]
pub struct BatchJob {
    pub id: String,
    pub name: String,
    pub status: String,
}

#[tauri::command]
pub async fn batch_list_jobs(profile: String, job_queue: String) -> Result<Vec<BatchJob>, String> {
    let client = create_batch_client(&profile).await;
    let resp = client.list_jobs().job_queue(&job_queue).send().await.map_err(|e| e.to_string())?;
    Ok(resp.job_summary_list().iter().map(|j| BatchJob {
        id: j.job_id().unwrap_or_default().to_string(),
        name: j.job_name().unwrap_or_default().to_string(),
        status: j.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn batch_submit_job(profile: String, job_name: String, job_queue: String, job_definition: String) -> Result<String, String> {
    let client = create_batch_client(&profile).await;
    let resp = client.submit_job()
        .job_name(&job_name)
        .job_queue(&job_queue)
        .job_definition(&job_definition)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.job_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn batch_cancel_job(profile: String, job_id: String) -> Result<String, String> {
    let client = create_batch_client(&profile).await;
    client.cancel_job().job_id(&job_id).reason("Cancelled from aws-desktop-center").send().await.map_err(|e| e.to_string())?;
    Ok(format!("Job {} cancelled", job_id))
}

#[tauri::command]
pub async fn batch_terminate_job(profile: String, job_id: String) -> Result<String, String> {
    let client = create_batch_client(&profile).await;
    client.terminate_job().job_id(&job_id).reason("Terminated from aws-desktop-center").send().await.map_err(|e| e.to_string())?;
    Ok(format!("Job {} terminated", job_id))
}
