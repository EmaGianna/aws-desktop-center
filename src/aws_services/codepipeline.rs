use super::load_config;
use aws_sdk_codepipeline::Client;
use serde::Serialize;

pub async fn create_codepipeline_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Pipeline {
    pub name: String,
    pub created: String,
    pub updated: String,
}

#[tauri::command]
pub async fn codepipeline_list_pipelines(profile: String) -> Result<Vec<Pipeline>, String> {
    let client = create_codepipeline_client(&profile).await;
    let resp = client.list_pipelines().send().await.map_err(|e| e.to_string())?;
    Ok(resp.pipelines().iter().map(|p| Pipeline {
        name: p.name().unwrap_or_default().to_string(),
        created: p.created().map(|d| d.to_string()).unwrap_or_default(),
        updated: p.updated().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct StageState {
    pub stage_name: String,
    pub status: String,
}

#[tauri::command]
pub async fn codepipeline_get_state(profile: String, name: String) -> Result<Vec<StageState>, String> {
    let client = create_codepipeline_client(&profile).await;
    let resp = client.get_pipeline_state().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.stage_states().iter().map(|s| StageState {
        stage_name: s.stage_name().unwrap_or_default().to_string(),
        status: s.latest_execution().map(|e| e.status().as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn codepipeline_start_execution(profile: String, name: String) -> Result<String, String> {
    let client = create_codepipeline_client(&profile).await;
    let resp = client.start_pipeline_execution().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.pipeline_execution_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn codepipeline_delete_pipeline(profile: String, name: String) -> Result<String, String> {
    let client = create_codepipeline_client(&profile).await;
    client.delete_pipeline().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Pipeline {} deleted", name))
}
