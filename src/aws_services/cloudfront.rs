use super::load_config;
use aws_sdk_cloudfront::Client;
use serde::Serialize;

pub async fn create_cloudfront_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Distribution {
    pub id: String,
    pub domain_name: String,
    pub status: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn cloudfront_list_distributions(profile: String) -> Result<Vec<Distribution>, String> {
    let client = create_cloudfront_client(&profile).await;
    let resp = client.list_distributions().send().await.map_err(|e| e.to_string())?;
    let items = resp.distribution_list().map(|l| l.items()).unwrap_or_default();
    Ok(items.iter().map(|d| Distribution {
        id: d.id().to_string(),
        domain_name: d.domain_name().to_string(),
        status: d.status().to_string(),
        enabled: d.enabled(),
    }).collect())
}

#[tauri::command]
pub async fn cloudfront_create_invalidation(profile: String, distribution_id: String, paths: Vec<String>) -> Result<String, String> {
    let client = create_cloudfront_client(&profile).await;
    let millis = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let items = aws_sdk_cloudfront::types::Paths::builder()
        .quantity(paths.len() as i32)
        .set_items(Some(paths))
        .build().map_err(|e| e.to_string())?;
    let batch = aws_sdk_cloudfront::types::InvalidationBatch::builder()
        .paths(items)
        .caller_reference(format!("aws-desktop-center-{}", millis))
        .build().map_err(|e| e.to_string())?;
    let resp = client.create_invalidation().distribution_id(&distribution_id).invalidation_batch(batch).send().await.map_err(|e| e.to_string())?;
    Ok(resp.invalidation().map(|i| i.id()).unwrap_or_default().to_string())
}
