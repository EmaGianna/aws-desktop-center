use super::load_config;
use aws_sdk_opensearch::Client;
use serde::Serialize;

pub async fn create_opensearch_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct OpenSearchDomain {
    pub name: String,
    pub arn: String,
    pub endpoint: String,
    pub engine_version: String,
    pub processing: bool,
}

#[tauri::command]
pub async fn opensearch_list_domains(profile: String) -> Result<Vec<OpenSearchDomain>, String> {
    let client = create_opensearch_client(&profile).await;
    let names_resp = client.list_domain_names().send().await.map_err(|e| e.to_string())?;
    let mut domains = Vec::new();
    for d in names_resp.domain_names() {
        if let Some(name) = d.domain_name() {
            let resp = client.describe_domain().domain_name(name).send().await.map_err(|e| e.to_string())?;
            if let Some(status) = resp.domain_status() {
                domains.push(OpenSearchDomain {
                    name: status.domain_name().to_string(),
                    arn: status.arn().to_string(),
                    endpoint: status.endpoint().unwrap_or_default().to_string(),
                    engine_version: status.engine_version().unwrap_or_default().to_string(),
                    processing: status.processing().unwrap_or(false),
                });
            }
        }
    }
    Ok(domains)
}

#[tauri::command]
pub async fn opensearch_create_domain(profile: String, domain_name: String, engine_version: String) -> Result<String, String> {
    let client = create_opensearch_client(&profile).await;
    client.create_domain().domain_name(&domain_name).engine_version(&engine_version).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Domain {} creating", domain_name))
}

#[tauri::command]
pub async fn opensearch_delete_domain(profile: String, domain_name: String) -> Result<String, String> {
    let client = create_opensearch_client(&profile).await;
    client.delete_domain().domain_name(&domain_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Domain {} deleting", domain_name))
}
