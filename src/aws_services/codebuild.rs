use super::load_config;
use aws_sdk_codebuild::Client;
use serde::Serialize;

pub async fn create_codebuild_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[tauri::command]
pub async fn codebuild_list_projects(profile: String) -> Result<Vec<String>, String> {
    let client = create_codebuild_client(&profile).await;
    let resp = client.list_projects().send().await.map_err(|e| e.to_string())?;
    Ok(resp.projects().to_vec())
}

#[derive(Serialize)]
pub struct CodeBuildRun {
    pub id: String,
    pub status: String,
    pub current_phase: String,
    pub start_time: String,
    pub end_time: String,
}

#[tauri::command]
pub async fn codebuild_list_builds(profile: String, project_name: String) -> Result<Vec<CodeBuildRun>, String> {
    let client = create_codebuild_client(&profile).await;
    let ids_resp = client.list_builds_for_project().project_name(&project_name).send().await.map_err(|e| e.to_string())?;
    let ids: Vec<String> = ids_resp.ids().to_vec();
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let resp = client.batch_get_builds().set_ids(Some(ids)).send().await.map_err(|e| e.to_string())?;
    Ok(resp.builds().iter().map(|b| CodeBuildRun {
        id: b.id().unwrap_or_default().to_string(),
        status: b.build_status().map(|s| s.as_str().to_string()).unwrap_or_default(),
        current_phase: b.current_phase().unwrap_or_default().to_string(),
        start_time: b.start_time().map(|d| d.to_string()).unwrap_or_default(),
        end_time: b.end_time().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn codebuild_start_build(profile: String, project_name: String) -> Result<String, String> {
    let client = create_codebuild_client(&profile).await;
    let resp = client.start_build().project_name(&project_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.build_value().and_then(|b| b.id()).unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn codebuild_stop_build(profile: String, build_id: String) -> Result<String, String> {
    let client = create_codebuild_client(&profile).await;
    client.stop_build().id(&build_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Build {} stopped", build_id))
}
