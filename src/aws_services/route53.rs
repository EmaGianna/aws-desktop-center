use super::load_config;
use aws_sdk_route53::types::{Change, ChangeAction, ChangeBatch, RrType, ResourceRecord, ResourceRecordSet};
use aws_sdk_route53::Client;
use serde::Serialize;

pub async fn create_route53_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct HostedZone {
    pub id: String,
    pub name: String,
    pub record_count: i64,
}

#[tauri::command]
pub async fn route53_list_zones(profile: String) -> Result<Vec<HostedZone>, String> {
    let client = create_route53_client(&profile).await;
    let resp = client.list_hosted_zones().send().await.map_err(|e| e.to_string())?;
    Ok(resp.hosted_zones().iter().map(|z| HostedZone {
        id: z.id().to_string(),
        name: z.name().to_string(),
        record_count: z.resource_record_set_count().unwrap_or(0),
    }).collect())
}

#[tauri::command]
pub async fn route53_create_zone(profile: String, name: String) -> Result<String, String> {
    let client = create_route53_client(&profile).await;
    let millis = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let caller_reference = format!("aws-desktop-center-{}", millis);
    let resp = client.create_hosted_zone().name(&name).caller_reference(&caller_reference).send().await.map_err(|e| e.to_string())?;
    Ok(resp.hosted_zone().map(|z| z.id().to_string()).unwrap_or_default())
}

#[tauri::command]
pub async fn route53_delete_zone(profile: String, zone_id: String) -> Result<String, String> {
    let client = create_route53_client(&profile).await;
    client.delete_hosted_zone().id(&zone_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Hosted zone {} deleted", zone_id))
}

#[derive(Serialize)]
pub struct DnsRecord {
    pub name: String,
    pub record_type: String,
    pub ttl: i64,
    pub values: Vec<String>,
}

#[tauri::command]
pub async fn route53_list_records(profile: String, zone_id: String) -> Result<Vec<DnsRecord>, String> {
    let client = create_route53_client(&profile).await;
    let resp = client.list_resource_record_sets().hosted_zone_id(&zone_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.resource_record_sets().iter().map(|r| DnsRecord {
        name: r.name().to_string(),
        record_type: r.r#type().as_str().to_string(),
        ttl: r.ttl().unwrap_or(0),
        values: r.resource_records().iter().map(|v| v.value().to_string()).collect(),
    }).collect())
}

#[tauri::command]
pub async fn route53_upsert_record(profile: String, zone_id: String, name: String, record_type: String, value: String, ttl: i64) -> Result<String, String> {
    let client = create_route53_client(&profile).await;
    let record_set = ResourceRecordSet::builder()
        .name(&name)
        .r#type(RrType::from(record_type.as_str()))
        .ttl(ttl)
        .resource_records(ResourceRecord::builder().value(&value).build().map_err(|e| e.to_string())?)
        .build().map_err(|e| e.to_string())?;
    let change = Change::builder().action(ChangeAction::Upsert).resource_record_set(record_set).build().map_err(|e| e.to_string())?;
    let batch = ChangeBatch::builder().changes(change).build().map_err(|e| e.to_string())?;
    client.change_resource_record_sets().hosted_zone_id(&zone_id).change_batch(batch).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Record {} upserted", name))
}
