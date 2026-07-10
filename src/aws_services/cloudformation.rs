use super::load_config;
use aws_sdk_cloudformation::Client;
use serde::Serialize;

pub async fn create_cloudformation_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Stack {
    pub id: String,
    pub name: String,
    pub status: String,
    pub creation_time: String,
}

#[tauri::command]
pub async fn cfn_list_stacks(profile: String) -> Result<Vec<Stack>, String> {
    let client = create_cloudformation_client(&profile).await;
    let resp = client.list_stacks().send().await.map_err(|e| e.to_string())?;
    Ok(resp.stack_summaries().iter().map(|s| Stack {
        id: s.stack_id().unwrap_or_default().to_string(),
        name: s.stack_name().unwrap_or_default().to_string(),
        status: s.stack_status().map(|st| st.as_str().to_string()).unwrap_or_default(),
        creation_time: s.creation_time().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct StackResource {
    pub logical_id: String,
    pub resource_type: String,
    pub status: String,
}

#[tauri::command]
pub async fn cfn_list_stack_resources(profile: String, stack_name: String) -> Result<Vec<StackResource>, String> {
    let client = create_cloudformation_client(&profile).await;
    let resp = client.list_stack_resources().stack_name(&stack_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.stack_resource_summaries().iter().map(|r| StackResource {
        logical_id: r.logical_resource_id().unwrap_or_default().to_string(),
        resource_type: r.resource_type().unwrap_or_default().to_string(),
        status: r.resource_status().map(|st| st.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn cfn_delete_stack(profile: String, stack_name: String) -> Result<String, String> {
    let client = create_cloudformation_client(&profile).await;
    client.delete_stack().stack_name(&stack_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Stack {} deleting", stack_name))
}
