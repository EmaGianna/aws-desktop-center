use super::load_config;
use aws_sdk_s3::Client;
use aws_sdk_s3::presigning::PresigningConfig;
use serde::Serialize;
use std::collections::HashMap;
use std::time::Duration;

#[derive(Serialize)]
pub struct Bucket {
    pub name: String,
    pub creation_date: String,
}

#[derive(Serialize)]
pub struct S3Object {
    pub key: String,
    pub size: i64,
    pub last_modified: String,
    pub storage_class: String,
}

#[derive(Serialize)]
pub struct S3Prefix {
    pub prefix: String,
}

#[derive(Serialize)]
pub struct ListObjectsResult {
    pub objects: Vec<S3Object>,
    pub prefixes: Vec<S3Prefix>,
}

#[derive(Serialize)]
pub struct ObjectDetail {
    pub key: String,
    pub size: i64,
    pub last_modified: String,
    pub content_type: String,
    pub etag: String,
    pub storage_class: String,
    pub metadata: HashMap<String, String>,
    pub tags: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub objects: Vec<S3Object>,
    pub total: usize,
}



#[tauri::command]
pub async fn list_buckets(profile: String) -> Result<Vec<Bucket>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_buckets().send().await.map_err(|e| e.to_string())?;
    Ok(resp.buckets().iter().map(|b| Bucket {
        name: b.name().unwrap_or_default().to_string(),
        creation_date: b.creation_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn list_objects(profile: String, bucket: String, prefix: String) -> Result<ListObjectsResult, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_objects_v2()
        .bucket(&bucket)
        .prefix(&prefix)
        .delimiter("/")
        .max_keys(500)
        .send().await.map_err(|e| e.to_string())?;

    let objects = resp.contents().iter().map(|o| S3Object {
        key: o.key().unwrap_or_default().to_string(),
        size: o.size().unwrap_or(0),
        last_modified: o.last_modified().map(|d| d.to_string()).unwrap_or_default(),
        storage_class: o.storage_class().map(|s| format!("{:?}", s)).unwrap_or_else(|| "STANDARD".to_string()),
    }).collect();

    let prefixes = resp.common_prefixes().iter().map(|p| S3Prefix {
        prefix: p.prefix().unwrap_or_default().to_string(),
    }).collect();

    Ok(ListObjectsResult { objects, prefixes })
}

#[tauri::command]
pub async fn get_object_detail(profile: String, bucket: String, key: String) -> Result<ObjectDetail, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);

    let head = client.head_object().bucket(&bucket).key(&key)
        .send().await.map_err(|e| e.to_string())?;

    let tags_resp = client.get_object_tagging().bucket(&bucket).key(&key)
        .send().await;
    let tags: HashMap<String, String> = tags_resp.map(|t| {
        t.tag_set().iter().map(|tag| (tag.key().to_string(), tag.value().to_string())).collect()
    }).unwrap_or_default();

    Ok(ObjectDetail {
        key: key.clone(),
        size: head.content_length().unwrap_or(0),
        last_modified: head.last_modified().map(|d| d.to_string()).unwrap_or_default(),
        content_type: head.content_type().unwrap_or_default().to_string(),
        etag: head.e_tag().unwrap_or_default().to_string(),
        storage_class: head.storage_class().map(|s| format!("{:?}", s)).unwrap_or_else(|| "STANDARD".to_string()),
        metadata: head.metadata().cloned().unwrap_or_default(),
        tags,
    })
}

#[tauri::command]
pub async fn generate_presigned_url(profile: String, bucket: String, key: String, expiry_secs: u64) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let presign_config = PresigningConfig::expires_in(Duration::from_secs(expiry_secs))
        .map_err(|e| e.to_string())?;
    let req = client.get_object().bucket(&bucket).key(&key)
        .presigned(presign_config).await.map_err(|e| e.to_string())?;
    Ok(req.uri().to_string())
}

#[tauri::command]
pub async fn search_objects(profile: String, bucket: String, prefix: String, query: String, max_results: i32) -> Result<SearchResult, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let query_lower = query.to_lowercase();

    let mut all_objects = Vec::new();
    let mut continuation_token: Option<String> = None;

    loop {
        let mut req = client.list_objects_v2()
            .bucket(&bucket)
            .prefix(&prefix)
            .max_keys(1000);
        if let Some(token) = &continuation_token {
            req = req.continuation_token(token);
        }
        let resp = req.send().await.map_err(|e| e.to_string())?;

        for obj in resp.contents() {
            let key = obj.key().unwrap_or_default();
            if key.to_lowercase().contains(&query_lower) {
                all_objects.push(S3Object {
                    key: key.to_string(),
                    size: obj.size().unwrap_or(0),
                    last_modified: obj.last_modified().map(|d| d.to_string()).unwrap_or_default(),
                    storage_class: obj.storage_class().map(|s| format!("{:?}", s)).unwrap_or_else(|| "STANDARD".to_string()),
                });
                if all_objects.len() >= max_results as usize {
                    return Ok(SearchResult { total: all_objects.len(), objects: all_objects });
                }
            }
        }

        if resp.is_truncated() == Some(true) {
            continuation_token = resp.next_continuation_token().map(|s| s.to_string());
        } else {
            break;
        }
    }

    let total = all_objects.len();
    Ok(SearchResult { objects: all_objects, total })
}

#[tauri::command]
pub async fn upload_object(profile: String, bucket: String, key: String, file_path: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let body = aws_sdk_s3::primitives::ByteStream::from_path(&file_path).await.map_err(|e| e.to_string())?;
    client.put_object()
        .bucket(&bucket)
        .key(&key)
        .body(body)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Uploaded {} to s3://{}/{}", file_path, bucket, key))
}

#[tauri::command]
pub async fn download_object(profile: String, bucket: String, key: String, dest_path: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_object().bucket(&bucket).key(&key)
        .send().await.map_err(|e| e.to_string())?;
    let bytes = resp.body.collect().await.map_err(|e| e.to_string())?;
    std::fs::write(&dest_path, bytes.into_bytes()).map_err(|e| e.to_string())?;
    Ok(format!("Downloaded to {}", dest_path))
}

#[tauri::command]
pub async fn delete_object(profile: String, bucket: String, key: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.delete_object().bucket(&bucket).key(&key)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Deleted s3://{}/{}", bucket, key))
}

#[tauri::command]
pub async fn copy_object(profile: String, source_bucket: String, source_key: String, dest_bucket: String, dest_key: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let copy_source = format!("{}/{}", source_bucket, source_key);
    client.copy_object()
        .bucket(&dest_bucket)
        .key(&dest_key)
        .copy_source(&copy_source)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Copied to s3://{}/{}", dest_bucket, dest_key))
}

#[tauri::command]
pub async fn move_object(profile: String, source_bucket: String, source_key: String, dest_bucket: String, dest_key: String) -> Result<String, String> {
    copy_object(profile.clone(), source_bucket.clone(), source_key.clone(), dest_bucket.clone(), dest_key.clone()).await?;
    delete_object(profile, source_bucket, source_key).await?;
    Ok(format!("Moved to s3://{}/{}", dest_bucket, dest_key))
}
