use super::load_config;
use aws_sdk_sfn::Client;
use serde::Serialize;

pub async fn create_sfn_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct StateMachine {
    pub arn: String,
    pub name: String,
    pub creation_date: String,
}

#[tauri::command]
pub async fn sfn_list_state_machines(profile: String) -> Result<Vec<StateMachine>, String> {
    let client = create_sfn_client(&profile).await;
    let resp = client.list_state_machines().send().await.map_err(|e| e.to_string())?;
    Ok(resp.state_machines().iter().map(|s| StateMachine {
        arn: s.state_machine_arn().to_string(),
        name: s.name().to_string(),
        creation_date: s.creation_date().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct SfnExecution {
    pub arn: String,
    pub name: String,
    pub status: String,
    pub start_date: String,
    pub stop_date: String,
}

#[tauri::command]
pub async fn sfn_list_executions(profile: String, state_machine_arn: String) -> Result<Vec<SfnExecution>, String> {
    let client = create_sfn_client(&profile).await;
    let resp = client.list_executions().state_machine_arn(&state_machine_arn).send().await.map_err(|e| e.to_string())?;
    Ok(resp.executions().iter().map(|e| SfnExecution {
        arn: e.execution_arn().to_string(),
        name: e.name().to_string(),
        status: e.status().as_str().to_string(),
        start_date: e.start_date().to_string(),
        stop_date: e.stop_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn sfn_start_execution(profile: String, state_machine_arn: String, input: String) -> Result<String, String> {
    let client = create_sfn_client(&profile).await;
    let mut req = client.start_execution().state_machine_arn(&state_machine_arn);
    if !input.is_empty() {
        req = req.input(&input);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.execution_arn().to_string())
}

#[tauri::command]
pub async fn sfn_stop_execution(profile: String, execution_arn: String) -> Result<String, String> {
    let client = create_sfn_client(&profile).await;
    client.stop_execution().execution_arn(&execution_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Execution {} stopped", execution_arn))
}

#[derive(Serialize)]
pub struct ExecutionDetail {
    pub status: String,
    pub input: String,
    pub output: String,
}

#[tauri::command]
pub async fn sfn_describe_execution(profile: String, execution_arn: String) -> Result<ExecutionDetail, String> {
    let client = create_sfn_client(&profile).await;
    let resp = client.describe_execution().execution_arn(&execution_arn).send().await.map_err(|e| e.to_string())?;
    Ok(ExecutionDetail {
        status: resp.status().as_str().to_string(),
        input: resp.input().unwrap_or_default().to_string(),
        output: resp.output().unwrap_or_default().to_string(),
    })
}
