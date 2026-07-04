use super::load_config;
use super::s3::create_s3_client;
use aws_sdk_athena::Client;
use aws_sdk_s3::presigning::PresigningConfig;
use serde::Serialize;
use std::time::Duration;

#[derive(Serialize)]
pub struct QueryExecution {
    pub id: String,
    pub query: String,
    pub state: String,
    pub database: String,
    pub output_location: String,
    pub data_scanned_bytes: i64,
    pub execution_time_ms: i64,
    pub submitted: String,
}

#[derive(Serialize)]
pub struct QueryResultSet {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total_rows: usize,
}

#[derive(Serialize)]
pub struct AthenaDatabase {
    pub name: String,
}

#[derive(Serialize)]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub database: String,
    pub query: String,
}

#[tauri::command]
pub async fn athena_list_databases(profile: String, catalog: String) -> Result<Vec<AthenaDatabase>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let cat = if catalog.is_empty() { "AwsDataCatalog".to_string() } else { catalog };
    let resp = client.list_databases().catalog_name(&cat).send().await.map_err(|e| e.to_string())?;
    Ok(resp.database_list().iter().map(|db| AthenaDatabase {
        name: db.name().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn list_executions(profile: String) -> Result<Vec<QueryExecution>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_query_executions().max_results(20).send().await.map_err(|e| e.to_string())?;
    let ids = resp.query_execution_ids();
    let mut executions = Vec::new();
    for id in ids.iter().take(20) {
        if let Ok(detail) = client.get_query_execution().query_execution_id(id).send().await {
            if let Some(qe) = detail.query_execution() {
                let stats = qe.statistics();
                let status = qe.status();
                executions.push(QueryExecution {
                    id: id.clone(),
                    query: qe.query().unwrap_or_default().to_string(),
                    state: status.and_then(|s| s.state()).map(|s| format!("{:?}", s)).unwrap_or_default(),
                    database: qe.query_execution_context().and_then(|c| c.database()).unwrap_or_default().to_string(),
                    output_location: qe.result_configuration().and_then(|r| r.output_location()).unwrap_or_default().to_string(),                    data_scanned_bytes: stats.map(|s| s.data_scanned_in_bytes().unwrap_or(0)).unwrap_or(0),
                    execution_time_ms: stats.map(|s| s.engine_execution_time_in_millis().unwrap_or(0)).unwrap_or(0),
                    submitted: status.and_then(|s| s.submission_date_time()).map(|d| d.to_string()).unwrap_or_default(),
                });
            }
        }
    }
    Ok(executions)
}

#[tauri::command]
pub async fn athena_list_saved_queries(profile: String) -> Result<Vec<SavedQuery>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_named_queries().send().await.map_err(|e| e.to_string())?;
    let ids = resp.named_query_ids();
    let mut queries = Vec::new();
    for id in ids.iter().take(20) {
        if let Ok(detail) = client.get_named_query().named_query_id(id).send().await {
            if let Some(nq) = detail.named_query() {
                queries.push(SavedQuery {
                    id: id.clone(),
                    name: nq.name().to_string(),
                    database: nq.database().to_string(),
                    query: nq.query_string().to_string(),
                });
            }
        }
    }
    Ok(queries)
}

#[tauri::command]
pub async fn start_query(profile: String, query: String, database: String, output_location: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.start_query_execution()
        .query_string(&query)
        .query_execution_context(
            aws_sdk_athena::types::QueryExecutionContext::builder().database(&database).build()
        )
        .result_configuration(
            aws_sdk_athena::types::ResultConfiguration::builder().output_location(&output_location).build()
        )
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.query_execution_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn athena_get_query_status(profile: String, query_execution_id: String) -> Result<QueryExecution, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_query_execution().query_execution_id(&query_execution_id).send().await.map_err(|e| e.to_string())?;
    let qe = resp.query_execution().ok_or("No execution found")?;
    let stats = qe.statistics();
    let status = qe.status();
    Ok(QueryExecution {
        id: query_execution_id,
        query: qe.query().unwrap_or_default().to_string(),
        state: status.and_then(|s| s.state()).map(|s| format!("{:?}", s)).unwrap_or_default(),
        database: qe.query_execution_context().and_then(|c| c.database()).unwrap_or_default().to_string(),
        output_location: qe.result_configuration().and_then(|r| r.output_location()).unwrap_or_default().to_string(),
        data_scanned_bytes: stats.map(|s| s.data_scanned_in_bytes().unwrap_or(0)).unwrap_or(0),
        execution_time_ms: stats.map(|s| s.engine_execution_time_in_millis().unwrap_or(0)).unwrap_or(0),
        submitted: status.and_then(|s| s.submission_date_time()).map(|d| d.to_string()).unwrap_or_default(),
    })
}

#[tauri::command]
pub async fn get_results(profile: String, query_execution_id: String) -> Result<QueryResultSet, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_query_results().query_execution_id(&query_execution_id).max_results(200).send().await.map_err(|e| e.to_string())?;
    let result_set = resp.result_set().ok_or("No results")?;
    let columns: Vec<String> = result_set.result_set_metadata()
        .map(|m| m.column_info().iter().map(|c| c.name().to_string()).collect())
        .unwrap_or_default();
    let rows: Vec<Vec<String>> = result_set.rows().iter().skip(1).map(|row| {
        row.data().iter().map(|d| d.var_char_value().unwrap_or_default().to_string()).collect()
    }).collect();
    let total_rows = rows.len();
    Ok(QueryResultSet { columns, rows, total_rows })
}

#[tauri::command]
pub async fn athena_download_results(profile: String, output_location: String, dest_path: String) -> Result<String, String> {
    let s3_client = create_s3_client(&profile).await;
    // output_location is like s3://bucket/path/query-id.csv
    let location = output_location.strip_prefix("s3://").ok_or("Invalid S3 path")?;
    let (bucket, key) = location.split_once('/').ok_or("Invalid S3 path format")?;
    let resp = s3_client.get_object().bucket(bucket).key(key)
        .send().await.map_err(|e| e.to_string())?;
    let bytes = resp.body.collect().await.map_err(|e| e.to_string())?;
    std::fs::write(&dest_path, bytes.into_bytes()).map_err(|e| e.to_string())?;
    Ok(format!("Downloaded to {}", dest_path))
}

#[tauri::command]
pub async fn athena_generate_results_link(profile: String, output_location: String, expiry_secs: u64) -> Result<String, String> {
    let s3_client = create_s3_client(&profile).await;
    let location = output_location.strip_prefix("s3://").ok_or("Invalid S3 path")?;
    let (bucket, key) = location.split_once('/').ok_or("Invalid S3 path format")?;
    let presign_config = PresigningConfig::expires_in(Duration::from_secs(expiry_secs))
        .map_err(|e| e.to_string())?;
    let req = s3_client.get_object().bucket(bucket).key(key)
        .presigned(presign_config).await.map_err(|e| e.to_string())?;
    Ok(req.uri().to_string())
}
