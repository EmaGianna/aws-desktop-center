use super::load_config;
use aws_sdk_apigateway::Client;
use serde::Serialize;

pub async fn create_apigateway_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct RestApi {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_date: String,
}

#[tauri::command]
pub async fn apigw_list_apis(profile: String) -> Result<Vec<RestApi>, String> {
    let client = create_apigateway_client(&profile).await;
    let resp = client.get_rest_apis().send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|a| RestApi {
        id: a.id().unwrap_or_default().to_string(),
        name: a.name().unwrap_or_default().to_string(),
        description: a.description().unwrap_or_default().to_string(),
        created_date: a.created_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct ApiResource {
    pub id: String,
    pub path: String,
}

#[tauri::command]
pub async fn apigw_list_resources(profile: String, rest_api_id: String) -> Result<Vec<ApiResource>, String> {
    let client = create_apigateway_client(&profile).await;
    let resp = client.get_resources().rest_api_id(&rest_api_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|r| ApiResource {
        id: r.id().unwrap_or_default().to_string(),
        path: r.path().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct ApiStage {
    pub name: String,
    pub deployment_id: String,
}

#[tauri::command]
pub async fn apigw_list_stages(profile: String, rest_api_id: String) -> Result<Vec<ApiStage>, String> {
    let client = create_apigateway_client(&profile).await;
    let resp = client.get_stages().rest_api_id(&rest_api_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.item().iter().map(|s| ApiStage {
        name: s.stage_name().unwrap_or_default().to_string(),
        deployment_id: s.deployment_id().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn apigw_delete_api(profile: String, rest_api_id: String) -> Result<String, String> {
    let client = create_apigateway_client(&profile).await;
    client.delete_rest_api().rest_api_id(&rest_api_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("API {} deleted", rest_api_id))
}
