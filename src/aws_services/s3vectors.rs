use super::load_config;
use aws_sdk_s3vectors::Client;
use serde::Serialize;

pub async fn create_s3vectors_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct VectorBucket {
    pub arn: String,
    pub name: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn s3vectors_list_buckets(profile: String) -> Result<Vec<VectorBucket>, String> {
    let client = create_s3vectors_client(&profile).await;
    let resp = client.list_vector_buckets().send().await.map_err(|e| e.to_string())?;
    Ok(resp.vector_buckets().iter().map(|b| VectorBucket {
        arn: b.vector_bucket_arn().to_string(),
        name: b.vector_bucket_name().to_string(),
        created_at: b.creation_time().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn s3vectors_create_bucket(profile: String, name: String) -> Result<String, String> {
    let client = create_s3vectors_client(&profile).await;
    client.create_vector_bucket().vector_bucket_name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Vector bucket {} created", name))
}

#[tauri::command]
pub async fn s3vectors_delete_bucket(profile: String, name: String) -> Result<String, String> {
    let client = create_s3vectors_client(&profile).await;
    client.delete_vector_bucket().vector_bucket_name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Vector bucket {} deleted", name))
}

#[derive(Serialize)]
pub struct VectorIndex {
    pub name: String,
    pub arn: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn s3vectors_list_indexes(profile: String, vector_bucket_name: String) -> Result<Vec<VectorIndex>, String> {
    let client = create_s3vectors_client(&profile).await;
    let resp = client.list_indexes().vector_bucket_name(&vector_bucket_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.indexes().iter().map(|i| VectorIndex {
        name: i.index_name().to_string(),
        arn: i.index_arn().to_string(),
        created_at: i.creation_time().to_string(),
    }).collect())
}
