use super::load_config;
use aws_sdk_costexplorer::types::{DateInterval, Granularity, GroupDefinition, GroupDefinitionType};
use aws_sdk_costexplorer::Client;
use serde::Serialize;

pub async fn create_costexplorer_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct CostByService {
    pub service_name: String,
    pub amount: String,
    pub unit: String,
}

#[tauri::command]
pub async fn ce_get_cost_by_service(profile: String, start_date: String, end_date: String) -> Result<Vec<CostByService>, String> {
    let client = create_costexplorer_client(&profile).await;
    let period = DateInterval::builder().start(&start_date).end(&end_date).build().map_err(|e| e.to_string())?;
    let group_by = GroupDefinition::builder().r#type(GroupDefinitionType::Dimension).key("SERVICE").build();

    let resp = client.get_cost_and_usage()
        .time_period(period)
        .granularity(Granularity::Monthly)
        .metrics("UnblendedCost")
        .group_by(group_by)
        .send().await.map_err(|e| e.to_string())?;

    let mut costs = Vec::new();
    for result in resp.results_by_time() {
        for group in result.groups() {
            let service_name = group.keys().first().cloned().unwrap_or_default();
            if let Some(metric) = group.metrics().and_then(|m| m.get("UnblendedCost")) {
                costs.push(CostByService {
                    service_name,
                    amount: metric.amount().unwrap_or_default().to_string(),
                    unit: metric.unit().unwrap_or_default().to_string(),
                });
            }
        }
    }
    Ok(costs)
}
