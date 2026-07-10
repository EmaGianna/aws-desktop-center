use super::load_config;
use aws_sdk_ssm::Client;
use serde::Serialize;

pub async fn create_ssm_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct SsmParameter {
    pub name: String,
    pub param_type: String,
    pub last_modified_date: String,
    pub version: i64,
}

#[tauri::command]
pub async fn ssm_list_parameters(profile: String) -> Result<Vec<SsmParameter>, String> {
    let client = create_ssm_client(&profile).await;
    let resp = client.describe_parameters().send().await.map_err(|e| e.to_string())?;
    Ok(resp.parameters().iter().map(|p| SsmParameter {
        name: p.name().unwrap_or_default().to_string(),
        param_type: p.r#type().map(|t| t.as_str().to_string()).unwrap_or_default(),
        last_modified_date: p.last_modified_date().map(|d| d.to_string()).unwrap_or_default(),
        version: p.version(),
    }).collect())
}

#[tauri::command]
pub async fn ssm_get_parameter(profile: String, name: String) -> Result<String, String> {
    let client = create_ssm_client(&profile).await;
    let resp = client.get_parameter().name(&name).with_decryption(true).send().await.map_err(|e| e.to_string())?;
    Ok(resp.parameter().and_then(|p| p.value()).unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn ssm_put_parameter(profile: String, name: String, value: String, param_type: String) -> Result<String, String> {
    let client = create_ssm_client(&profile).await;
    let t = aws_sdk_ssm::types::ParameterType::from(param_type.as_str());
    client.put_parameter().name(&name).value(&value).r#type(t).overwrite(true).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Parameter {} saved", name))
}

#[tauri::command]
pub async fn ssm_delete_parameter(profile: String, name: String) -> Result<String, String> {
    let client = create_ssm_client(&profile).await;
    client.delete_parameter().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Parameter {} deleted", name))
}
