use super::load_config;
use aws_sdk_apigatewayv2::Client;
use serde::Serialize;

pub async fn create_apigatewayv2_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct ApiV2 {
    pub id: String,
    pub name: String,
    pub protocol_type: String,
    pub endpoint: String,
}

#[tauri::command]
pub async fn apigwv2_list_apis(profile: String) -> Result<Vec<ApiV2>, String> {
    let client = create_apigatewayv2_client(&profile).await;
    let resp = client.get_apis().send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|a| ApiV2 {
        id: a.api_id().unwrap_or_default().to_string(),
        name: a.name().unwrap_or_default().to_string(),
        protocol_type: a.protocol_type().map(|p| p.as_str().to_string()).unwrap_or_default(),
        endpoint: a.api_endpoint().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct RouteV2 {
    pub id: String,
    pub route_key: String,
}

#[tauri::command]
pub async fn apigwv2_list_routes(profile: String, api_id: String) -> Result<Vec<RouteV2>, String> {
    let client = create_apigatewayv2_client(&profile).await;
    let resp = client.get_routes().api_id(&api_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|r| RouteV2 {
        id: r.route_id().unwrap_or_default().to_string(),
        route_key: r.route_key().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct StageV2 {
    pub name: String,
}

#[tauri::command]
pub async fn apigwv2_list_stages(profile: String, api_id: String) -> Result<Vec<StageV2>, String> {
    let client = create_apigatewayv2_client(&profile).await;
    let resp = client.get_stages().api_id(&api_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.items().iter().map(|s| StageV2 {
        name: s.stage_name().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn apigwv2_delete_api(profile: String, api_id: String) -> Result<String, String> {
    let client = create_apigatewayv2_client(&profile).await;
    client.delete_api().api_id(&api_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("API {} deleted", api_id))
}
