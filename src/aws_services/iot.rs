use super::load_config;
use aws_sdk_iot::Client;
use serde::Serialize;

pub async fn create_iot_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct IotThing {
    pub name: String,
    pub thing_type: String,
}

#[tauri::command]
pub async fn iot_list_things(profile: String) -> Result<Vec<IotThing>, String> {
    let client = create_iot_client(&profile).await;
    let resp = client.list_things().send().await.map_err(|e| e.to_string())?;
    Ok(resp.things().iter().map(|t| IotThing {
        name: t.thing_name().unwrap_or_default().to_string(),
        thing_type: t.thing_type_name().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn iot_create_thing(profile: String, thing_name: String) -> Result<String, String> {
    let client = create_iot_client(&profile).await;
    client.create_thing().thing_name(&thing_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Thing {} created", thing_name))
}

#[tauri::command]
pub async fn iot_delete_thing(profile: String, thing_name: String) -> Result<String, String> {
    let client = create_iot_client(&profile).await;
    client.delete_thing().thing_name(&thing_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Thing {} deleted", thing_name))
}

#[derive(Serialize)]
pub struct IotCertificate {
    pub id: String,
    pub status: String,
}

#[tauri::command]
pub async fn iot_list_certificates(profile: String) -> Result<Vec<IotCertificate>, String> {
    let client = create_iot_client(&profile).await;
    let resp = client.list_certificates().send().await.map_err(|e| e.to_string())?;
    Ok(resp.certificates().iter().map(|c| IotCertificate {
        id: c.certificate_id().unwrap_or_default().to_string(),
        status: c.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn iot_list_policies(profile: String) -> Result<Vec<String>, String> {
    let client = create_iot_client(&profile).await;
    let resp = client.list_policies().send().await.map_err(|e| e.to_string())?;
    Ok(resp.policies().iter().filter_map(|p| p.policy_name().map(|n| n.to_string())).collect())
}
