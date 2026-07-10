use super::load_config;
use aws_sdk_pipes::Client;
use serde::Serialize;

pub async fn create_pipes_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Pipe {
    pub name: String,
    pub arn: String,
    pub desired_state: String,
    pub current_state: String,
    pub source: String,
    pub target: String,
}

#[tauri::command]
pub async fn pipes_list(profile: String) -> Result<Vec<Pipe>, String> {
    let client = create_pipes_client(&profile).await;
    let resp = client.list_pipes().send().await.map_err(|e| e.to_string())?;
    Ok(resp.pipes().iter().map(|p| Pipe {
        name: p.name().unwrap_or_default().to_string(),
        arn: p.arn().unwrap_or_default().to_string(),
        desired_state: p.desired_state().map(|s| s.as_str().to_string()).unwrap_or_default(),
        current_state: p.current_state().map(|s| s.as_str().to_string()).unwrap_or_default(),
        source: p.source().unwrap_or_default().to_string(),
        target: p.target().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn pipes_create(profile: String, name: String, role_arn: String, source: String, target: String) -> Result<String, String> {
    let client = create_pipes_client(&profile).await;
    client.create_pipe()
        .name(&name)
        .role_arn(&role_arn)
        .source(&source)
        .target(&target)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Pipe {} created", name))
}

#[tauri::command]
pub async fn pipes_delete(profile: String, name: String) -> Result<String, String> {
    let client = create_pipes_client(&profile).await;
    client.delete_pipe().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Pipe {} deleted", name))
}

#[tauri::command]
pub async fn pipes_start(profile: String, name: String) -> Result<String, String> {
    let client = create_pipes_client(&profile).await;
    client.start_pipe().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Pipe {} started", name))
}

#[tauri::command]
pub async fn pipes_stop(profile: String, name: String) -> Result<String, String> {
    let client = create_pipes_client(&profile).await;
    client.stop_pipe().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Pipe {} stopped", name))
}
