use super::load_config;
use aws_sdk_config::Client;
use serde::Serialize;

pub async fn create_awsconfig_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct ConfigRule {
    pub name: String,
    pub state: String,
    pub compliance: String,
}

#[tauri::command]
pub async fn awsconfig_list_rules(profile: String) -> Result<Vec<ConfigRule>, String> {
    let client = create_awsconfig_client(&profile).await;
    let resp = client.describe_config_rules().send().await.map_err(|e| e.to_string())?;
    let compliance_resp = client.describe_compliance_by_config_rule().send().await.map_err(|e| e.to_string())?;
    let compliance_map: std::collections::HashMap<String, String> = compliance_resp.compliance_by_config_rules().iter()
        .filter_map(|c| {
            let name = c.config_rule_name()?.to_string();
            let status = c.compliance().and_then(|comp| comp.compliance_type()).map(|t| t.as_str().to_string()).unwrap_or_default();
            Some((name, status))
        }).collect();

    Ok(resp.config_rules().iter().map(|r| {
        let name = r.config_rule_name().unwrap_or_default().to_string();
        let compliance = compliance_map.get(&name).cloned().unwrap_or_default();
        ConfigRule {
            state: r.config_rule_state().map(|s| s.as_str().to_string()).unwrap_or_default(),
            name,
            compliance,
        }
    }).collect())
}
