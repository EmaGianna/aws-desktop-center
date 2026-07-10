use super::load_config;
use aws_sdk_costandusagereport::Client;
use serde::Serialize;

pub async fn create_cur_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct ReportDefinition {
    pub name: String,
    pub time_unit: String,
    pub format: String,
    pub s3_bucket: String,
}

#[tauri::command]
pub async fn cur_list_reports(profile: String) -> Result<Vec<ReportDefinition>, String> {
    let client = create_cur_client(&profile).await;
    let resp = client.describe_report_definitions().send().await.map_err(|e| e.to_string())?;
    Ok(resp.report_definitions().iter().map(|r| ReportDefinition {
        name: r.report_name().to_string(),
        time_unit: r.time_unit().as_str().to_string(),
        format: r.format().as_str().to_string(),
        s3_bucket: r.s3_bucket().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn cur_delete_report(profile: String, report_name: String) -> Result<String, String> {
    let client = create_cur_client(&profile).await;
    client.delete_report_definition().report_name(&report_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Report {} deleted", report_name))
}
