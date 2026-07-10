use super::load_config;
use aws_sdk_pricing::Client;

pub async fn create_pricing_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[tauri::command]
pub async fn pricing_list_service_codes(profile: String) -> Result<Vec<String>, String> {
    let client = create_pricing_client(&profile).await;
    let resp = client.describe_services().send().await.map_err(|e| e.to_string())?;
    Ok(resp.services().iter().map(|s| s.service_code().to_string()).collect())
}

#[tauri::command]
pub async fn pricing_get_products(profile: String, service_code: String) -> Result<Vec<String>, String> {
    let client = create_pricing_client(&profile).await;
    let resp = client.get_products().service_code(&service_code).max_results(10).send().await.map_err(|e| e.to_string())?;
    Ok(resp.price_list().to_vec())
}
