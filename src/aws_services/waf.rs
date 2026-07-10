use super::load_config;
use aws_sdk_wafv2::types::Scope;
use aws_sdk_wafv2::Client;
use serde::Serialize;

pub async fn create_waf_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

fn parse_scope(scope: &str) -> Scope {
    if scope.eq_ignore_ascii_case("CLOUDFRONT") { Scope::Cloudfront } else { Scope::Regional }
}

#[derive(Serialize)]
pub struct WebAcl {
    pub id: String,
    pub name: String,
    pub arn: String,
    pub description: String,
}

#[tauri::command]
pub async fn waf_list_web_acls(profile: String, scope: String) -> Result<Vec<WebAcl>, String> {
    let client = create_waf_client(&profile).await;
    let resp = client.list_web_acls().scope(parse_scope(&scope)).send().await.map_err(|e| e.to_string())?;
    Ok(resp.web_acls().iter().map(|w| WebAcl {
        id: w.id().unwrap_or_default().to_string(),
        name: w.name().unwrap_or_default().to_string(),
        arn: w.arn().unwrap_or_default().to_string(),
        description: w.description().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct IpSet {
    pub id: String,
    pub name: String,
    pub arn: String,
}

#[tauri::command]
pub async fn waf_list_ip_sets(profile: String, scope: String) -> Result<Vec<IpSet>, String> {
    let client = create_waf_client(&profile).await;
    let resp = client.list_ip_sets().scope(parse_scope(&scope)).send().await.map_err(|e| e.to_string())?;
    Ok(resp.ip_sets().iter().map(|s| IpSet {
        id: s.id().unwrap_or_default().to_string(),
        name: s.name().unwrap_or_default().to_string(),
        arn: s.arn().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn waf_create_ip_set(profile: String, name: String, scope: String, addresses: Vec<String>) -> Result<String, String> {
    let client = create_waf_client(&profile).await;
    let resp = client.create_ip_set()
        .name(&name)
        .scope(parse_scope(&scope))
        .ip_address_version(aws_sdk_wafv2::types::IpAddressVersion::Ipv4)
        .set_addresses(Some(addresses))
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.summary().and_then(|s| s.id()).unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn waf_delete_ip_set(profile: String, name: String, scope: String, id: String) -> Result<String, String> {
    let client = create_waf_client(&profile).await;
    let parsed_scope = parse_scope(&scope);
    let detail = client.get_ip_set().name(&name).scope(parsed_scope.clone()).id(&id).send().await.map_err(|e| e.to_string())?;
    let lock_token = detail.lock_token().unwrap_or_default();
    client.delete_ip_set().name(&name).scope(parsed_scope).id(&id).lock_token(lock_token).send().await.map_err(|e| e.to_string())?;
    Ok(format!("IP set {} deleted", name))
}
