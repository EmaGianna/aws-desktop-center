use super::load_config;
use aws_sdk_s3tables::Client;
use serde::Serialize;

pub async fn create_s3tables_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct TableBucket {
    pub arn: String,
    pub name: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn s3tables_list_buckets(profile: String) -> Result<Vec<TableBucket>, String> {
    let client = create_s3tables_client(&profile).await;
    let resp = client.list_table_buckets().send().await.map_err(|e| e.to_string())?;
    Ok(resp.table_buckets().iter().map(|b| TableBucket {
        arn: b.arn().to_string(),
        name: b.name().to_string(),
        created_at: b.created_at().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn s3tables_create_bucket(profile: String, name: String) -> Result<String, String> {
    let client = create_s3tables_client(&profile).await;
    let resp = client.create_table_bucket().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.arn().to_string())
}

#[tauri::command]
pub async fn s3tables_delete_bucket(profile: String, table_bucket_arn: String) -> Result<String, String> {
    let client = create_s3tables_client(&profile).await;
    client.delete_table_bucket().table_bucket_arn(&table_bucket_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Table bucket {} deleted", table_bucket_arn))
}

#[derive(Serialize)]
pub struct TableNamespace {
    pub namespace: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn s3tables_list_namespaces(profile: String, table_bucket_arn: String) -> Result<Vec<TableNamespace>, String> {
    let client = create_s3tables_client(&profile).await;
    let resp = client.list_namespaces().table_bucket_arn(&table_bucket_arn).send().await.map_err(|e| e.to_string())?;
    Ok(resp.namespaces().iter().map(|n| TableNamespace {
        namespace: n.namespace().join("."),
        created_at: n.created_at().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct TableSummary {
    pub name: String,
    pub namespace: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn s3tables_list_tables(profile: String, table_bucket_arn: String, namespace: String) -> Result<Vec<TableSummary>, String> {
    let client = create_s3tables_client(&profile).await;
    let mut req = client.list_tables().table_bucket_arn(&table_bucket_arn);
    if !namespace.is_empty() {
        req = req.namespace(&namespace);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.tables().iter().map(|t| TableSummary {
        name: t.name().to_string(),
        namespace: t.namespace().join("."),
        created_at: t.created_at().to_string(),
    }).collect())
}
