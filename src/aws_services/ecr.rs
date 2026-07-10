use super::load_config;
use aws_sdk_ecr::Client;
use serde::Serialize;

pub async fn create_ecr_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EcrRepository {
    pub name: String,
    pub uri: String,
    pub arn: String,
    pub created_at: String,
    pub tag_mutability: String,
}

#[tauri::command]
pub async fn ecr_list_repositories(profile: String) -> Result<Vec<EcrRepository>, String> {
    let client = create_ecr_client(&profile).await;
    let resp = client.describe_repositories().send().await.map_err(|e| e.to_string())?;
    Ok(resp.repositories().iter().map(|r| EcrRepository {
        name: r.repository_name().unwrap_or_default().to_string(),
        uri: r.repository_uri().unwrap_or_default().to_string(),
        arn: r.repository_arn().unwrap_or_default().to_string(),
        created_at: r.created_at().map(|d| d.to_string()).unwrap_or_default(),
        tag_mutability: r.image_tag_mutability().map(|m| m.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct EcrImage {
    pub digest: String,
    pub tags: Vec<String>,
    pub size_bytes: i64,
    pub pushed_at: String,
}

#[tauri::command]
pub async fn ecr_list_images(profile: String, repository_name: String) -> Result<Vec<EcrImage>, String> {
    let client = create_ecr_client(&profile).await;
    let resp = client.describe_images().repository_name(&repository_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.image_details().iter().map(|i| EcrImage {
        digest: i.image_digest().unwrap_or_default().to_string(),
        tags: i.image_tags().to_vec(),
        size_bytes: i.image_size_in_bytes().unwrap_or(0),
        pushed_at: i.image_pushed_at().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn ecr_create_repository(profile: String, repository_name: String) -> Result<String, String> {
    let client = create_ecr_client(&profile).await;
    client.create_repository().repository_name(&repository_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Repository {} created", repository_name))
}

#[tauri::command]
pub async fn ecr_delete_repository(profile: String, repository_name: String) -> Result<String, String> {
    let client = create_ecr_client(&profile).await;
    client.delete_repository().repository_name(&repository_name).force(true).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Repository {} deleted", repository_name))
}
