use super::load_config;
use aws_sdk_rdsdata::types::Field;
use aws_sdk_rdsdata::Client;
use serde::Serialize;

pub async fn create_rdsdata_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

fn field_to_string(field: &Field) -> String {
    match field {
        Field::BooleanValue(b) => b.to_string(),
        Field::DoubleValue(d) => d.to_string(),
        Field::IsNull(_) => "NULL".to_string(),
        Field::LongValue(l) => l.to_string(),
        Field::StringValue(s) => s.clone(),
        Field::BlobValue(_) => "<blob>".to_string(),
        Field::ArrayValue(_) => "<array>".to_string(),
        _ => "<unknown>".to_string(),
    }
}

#[derive(Serialize)]
pub struct RdsDataResult {
    pub rows: Vec<Vec<String>>,
    pub records_updated: i64,
}

#[tauri::command]
pub async fn rdsdata_execute_statement(profile: String, resource_arn: String, secret_arn: String, database: String, sql: String) -> Result<RdsDataResult, String> {
    let client = create_rdsdata_client(&profile).await;
    let resp = client.execute_statement()
        .resource_arn(&resource_arn)
        .secret_arn(&secret_arn)
        .database(&database)
        .sql(&sql)
        .include_result_metadata(true)
        .send().await.map_err(|e| e.to_string())?;

    let rows = resp.records().iter().map(|row| {
        row.iter().map(field_to_string).collect()
    }).collect();

    Ok(RdsDataResult {
        rows,
        records_updated: resp.number_of_records_updated(),
    })
}
