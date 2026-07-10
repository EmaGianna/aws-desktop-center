use super::cloudfront::create_cloudfront_client;
use serde::Serialize;

#[derive(Serialize)]
pub struct KeyValueStore {
    pub name: String,
    pub id: String,
    pub arn: String,
}

#[tauri::command]
pub async fn cfkvs_list_stores(profile: String) -> Result<Vec<KeyValueStore>, String> {
    let client = create_cloudfront_client(&profile).await;
    let resp = client.list_key_value_stores().send().await.map_err(|e| e.to_string())?;
    let items = resp.key_value_store_list().map(|l| l.items()).unwrap_or_default();
    Ok(items.iter().map(|s| KeyValueStore {
        name: s.name().to_string(),
        id: s.id().to_string(),
        arn: s.arn().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn cfkvs_create_store(profile: String, name: String) -> Result<String, String> {
    let client = create_cloudfront_client(&profile).await;
    client.create_key_value_store().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Key value store {} created", name))
}
