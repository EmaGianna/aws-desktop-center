use super::load_config;
use aws_sdk_resourcegroupstagging::Client;
use serde::Serialize;
use std::collections::HashMap;

pub async fn create_rgt_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct TaggedResource {
    pub arn: String,
    pub tags: HashMap<String, String>,
}

#[tauri::command]
pub async fn rgt_list_resources(profile: String) -> Result<Vec<TaggedResource>, String> {
    let client = create_rgt_client(&profile).await;
    let resp = client.get_resources().send().await.map_err(|e| e.to_string())?;
    Ok(resp.resource_tag_mapping_list().iter().map(|r| TaggedResource {
        arn: r.resource_arn().unwrap_or_default().to_string(),
        tags: r.tags().iter().map(|t| (t.key().to_string(), t.value().to_string())).collect(),
    }).collect())
}

#[tauri::command]
pub async fn rgt_list_tag_keys(profile: String) -> Result<Vec<String>, String> {
    let client = create_rgt_client(&profile).await;
    let resp = client.get_tag_keys().send().await.map_err(|e| e.to_string())?;
    Ok(resp.tag_keys().to_vec())
}

#[tauri::command]
pub async fn rgt_tag_resources(profile: String, resource_arns: Vec<String>, key: String, value: String) -> Result<String, String> {
    let client = create_rgt_client(&profile).await;
    let mut tags = HashMap::new();
    tags.insert(key, value);
    client.tag_resources().set_resource_arn_list(Some(resource_arns)).set_tags(Some(tags)).send().await.map_err(|e| e.to_string())?;
    Ok("Resources tagged".to_string())
}

#[tauri::command]
pub async fn rgt_untag_resources(profile: String, resource_arns: Vec<String>, keys: Vec<String>) -> Result<String, String> {
    let client = create_rgt_client(&profile).await;
    client.untag_resources().set_resource_arn_list(Some(resource_arns)).set_tag_keys(Some(keys)).send().await.map_err(|e| e.to_string())?;
    Ok("Resources untagged".to_string())
}
