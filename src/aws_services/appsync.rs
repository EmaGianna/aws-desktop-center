use super::load_config;
use aws_sdk_appsync::Client;
use serde::Serialize;

pub async fn create_appsync_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct GraphqlApi {
    pub id: String,
    pub name: String,
    pub authentication_type: String,
}

#[tauri::command]
pub async fn appsync_list_apis(profile: String) -> Result<Vec<GraphqlApi>, String> {
    let client = create_appsync_client(&profile).await;
    let resp = client.list_graphql_apis().send().await.map_err(|e| e.to_string())?;
    Ok(resp.graphql_apis().iter().map(|a| GraphqlApi {
        id: a.api_id().unwrap_or_default().to_string(),
        name: a.name().unwrap_or_default().to_string(),
        authentication_type: a.authentication_type().map(|t| t.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct DataSource {
    pub name: String,
    pub source_type: String,
}

#[tauri::command]
pub async fn appsync_list_data_sources(profile: String, api_id: String) -> Result<Vec<DataSource>, String> {
    let client = create_appsync_client(&profile).await;
    let resp = client.list_data_sources().api_id(&api_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.data_sources().iter().map(|d| DataSource {
        name: d.name().unwrap_or_default().to_string(),
        source_type: d.r#type().map(|t| t.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn appsync_delete_api(profile: String, api_id: String) -> Result<String, String> {
    let client = create_appsync_client(&profile).await;
    client.delete_graphql_api().api_id(&api_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("API {} deleted", api_id))
}
