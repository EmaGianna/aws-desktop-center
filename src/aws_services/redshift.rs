use super::load_config;
use aws_sdk_redshift::Client as RedshiftClient;
use aws_sdk_redshiftdata::Client as DataClient;
use serde::Serialize;

#[derive(Serialize)]
pub struct RedshiftCluster {
    pub id: String,
    pub node_type: String,
    pub num_nodes: i32,
    pub status: String,
    pub endpoint: String,
    pub port: i32,
    pub database: String,
    pub master_username: String,
    pub vpc_id: String,
    pub encrypted: bool,
    pub availability_zone: String,
    pub cluster_version: String,
    pub creation_date: String,
}

#[derive(Serialize)]
pub struct RedshiftSnapshot {
    pub id: String,
    pub cluster_id: String,
    pub snapshot_type: String,
    pub status: String,
    pub created: String,
    pub size_mb: f64,
    pub num_nodes: i32,
}

#[derive(Serialize)]
pub struct RedshiftQueryResult {
    pub statement_id: String,
    pub status: String,
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total_rows: i64,
}

#[derive(Serialize)]
pub struct RedshiftTable {
    pub schema_name: String,
    pub table_name: String,
    pub table_type: String,
}

#[tauri::command]
pub async fn redshift_list_clusters(profile: String) -> Result<Vec<RedshiftCluster>, String> {
    let config = load_config(&profile).await;
    let client = RedshiftClient::new(&config);
    let resp = client.describe_clusters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.clusters().iter().map(|c| {
        let ep = c.endpoint();
        RedshiftCluster {
            id: c.cluster_identifier().unwrap_or_default().to_string(),
            node_type: c.node_type().unwrap_or_default().to_string(),
            num_nodes: c.number_of_nodes().unwrap_or(0),
            status: c.cluster_status().unwrap_or_default().to_string(),
            endpoint: ep.map(|e| e.address().unwrap_or_default().to_string()).unwrap_or_default(),
            port: ep.and_then(|e| e.port()).unwrap_or(5439),
            database: c.db_name().unwrap_or_default().to_string(),
            master_username: c.master_username().unwrap_or_default().to_string(),
            vpc_id: c.vpc_id().unwrap_or_default().to_string(),
            encrypted: c.encrypted().unwrap_or(false),
            availability_zone: c.availability_zone().unwrap_or_default().to_string(),
            cluster_version: c.cluster_version().unwrap_or_default().to_string(),
            creation_date: c.cluster_create_time().map(|d| d.to_string()).unwrap_or_default(),
        }
    }).collect())
}

#[tauri::command]
pub async fn redshift_list_snapshots(profile: String, cluster_id: String) -> Result<Vec<RedshiftSnapshot>, String> {
    let config = load_config(&profile).await;
    let client = RedshiftClient::new(&config);
    let mut req = client.describe_cluster_snapshots();
    if !cluster_id.is_empty() {
        req = req.cluster_identifier(&cluster_id);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.snapshots().iter().map(|s| RedshiftSnapshot {
        id: s.snapshot_identifier().unwrap_or_default().to_string(),
        cluster_id: s.cluster_identifier().unwrap_or_default().to_string(),
        snapshot_type: s.snapshot_type().unwrap_or_default().to_string(),
        status: s.status().unwrap_or_default().to_string(),
        created: s.snapshot_create_time().map(|d| d.to_string()).unwrap_or_default(),
        size_mb: s.total_backup_size_in_mega_bytes().unwrap_or(0.0),
        num_nodes: s.number_of_nodes().unwrap_or(0),
    }).collect())
}

#[tauri::command]
pub async fn redshift_list_tables(profile: String, cluster_id: String, database: String) -> Result<Vec<RedshiftTable>, String> {
    let config = load_config(&profile).await;
    let client = DataClient::new(&config);
    let resp = client.list_tables()
        .cluster_identifier(&cluster_id)
        .database(&database)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.tables().iter().map(|t| RedshiftTable {
        schema_name: t.schema().unwrap_or_default().to_string(),
        table_name: t.name().unwrap_or_default().to_string(),
        table_type: t.r#type().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn redshift_execute_query(profile: String, cluster_id: String, database: String, sql: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = DataClient::new(&config);
    let resp = client.execute_statement()
        .cluster_identifier(&cluster_id)
        .database(&database)
        .sql(&sql)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn redshift_get_query_status(profile: String, statement_id: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = DataClient::new(&config);
    let resp = client.describe_statement()
        .id(&statement_id)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("{:?}", resp.status()))
}

#[tauri::command]
pub async fn redshift_get_query_results(profile: String, statement_id: String) -> Result<RedshiftQueryResult, String> {
    let config = load_config(&profile).await;
    let client = DataClient::new(&config);
    let resp = client.get_statement_result()
        .id(&statement_id)
        .send().await.map_err(|e| e.to_string())?;

    let columns: Vec<String> = resp.column_metadata().iter()
        .map(|c| c.name().unwrap_or_default().to_string())
        .collect();

    let rows: Vec<Vec<String>> = resp.records().iter().map(|row| {
        row.iter().map(|field| {
            match field {
                aws_sdk_redshiftdata::types::Field::BlobValue(_) => "<blob>".to_string(),
                aws_sdk_redshiftdata::types::Field::BooleanValue(b) => b.to_string(),
                aws_sdk_redshiftdata::types::Field::DoubleValue(d) => d.to_string(),
                aws_sdk_redshiftdata::types::Field::IsNull(true) => "NULL".to_string(),
                aws_sdk_redshiftdata::types::Field::IsNull(false) => "".to_string(),
                aws_sdk_redshiftdata::types::Field::LongValue(l) => l.to_string(),
                aws_sdk_redshiftdata::types::Field::StringValue(s) => s.clone(),
                _ => "".to_string(),
            }
        }).collect()
    }).collect();

    Ok(RedshiftQueryResult {
        statement_id: statement_id.clone(),
        status: "FINISHED".to_string(),
        columns,
        rows,
        total_rows: resp.total_num_rows(),
    })
}
