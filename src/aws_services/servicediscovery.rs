use super::load_config;
use aws_sdk_servicediscovery::Client;
use serde::Serialize;

pub async fn create_servicediscovery_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Namespace {
    pub id: String,
    pub name: String,
    pub ns_type: String,
}

#[tauri::command]
pub async fn cloudmap_list_namespaces(profile: String) -> Result<Vec<Namespace>, String> {
    let client = create_servicediscovery_client(&profile).await;
    let resp = client.list_namespaces().send().await.map_err(|e| e.to_string())?;
    Ok(resp.namespaces().iter().map(|n| Namespace {
        id: n.id().unwrap_or_default().to_string(),
        name: n.name().unwrap_or_default().to_string(),
        ns_type: n.r#type().map(|t| t.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct CloudMapService {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn cloudmap_list_services(profile: String, namespace_id: String) -> Result<Vec<CloudMapService>, String> {
    let client = create_servicediscovery_client(&profile).await;
    let filter = aws_sdk_servicediscovery::types::ServiceFilter::builder()
        .name(aws_sdk_servicediscovery::types::ServiceFilterName::NamespaceId)
        .values(&namespace_id)
        .build().map_err(|e| e.to_string())?;
    let resp = client.list_services().filters(filter).send().await.map_err(|e| e.to_string())?;
    Ok(resp.services().iter().map(|s| CloudMapService {
        id: s.id().unwrap_or_default().to_string(),
        name: s.name().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct ServiceInstance {
    pub id: String,
}

#[tauri::command]
pub async fn cloudmap_list_instances(profile: String, service_id: String) -> Result<Vec<ServiceInstance>, String> {
    let client = create_servicediscovery_client(&profile).await;
    let resp = client.list_instances().service_id(&service_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.instances().iter().map(|i| ServiceInstance {
        id: i.id().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn cloudmap_delete_service(profile: String, service_id: String) -> Result<String, String> {
    let client = create_servicediscovery_client(&profile).await;
    client.delete_service().id(&service_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Service {} deleted", service_id))
}
