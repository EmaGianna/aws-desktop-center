use super::load_config;
use aws_sdk_elasticloadbalancingv2::Client;
use serde::Serialize;

pub async fn create_elbv2_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct LoadBalancer {
    pub arn: String,
    pub name: String,
    pub dns_name: String,
    pub state: String,
    pub lb_type: String,
}

#[tauri::command]
pub async fn elbv2_list_load_balancers(profile: String) -> Result<Vec<LoadBalancer>, String> {
    let client = create_elbv2_client(&profile).await;
    let resp = client.describe_load_balancers().send().await.map_err(|e| e.to_string())?;
    Ok(resp.load_balancers().iter().map(|lb| LoadBalancer {
        arn: lb.load_balancer_arn().unwrap_or_default().to_string(),
        name: lb.load_balancer_name().unwrap_or_default().to_string(),
        dns_name: lb.dns_name().unwrap_or_default().to_string(),
        state: lb.state().and_then(|s| s.code()).map(|c| c.as_str().to_string()).unwrap_or_default(),
        lb_type: lb.r#type().map(|t| t.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct TargetGroup {
    pub arn: String,
    pub name: String,
    pub protocol: String,
    pub port: i32,
}

#[tauri::command]
pub async fn elbv2_list_target_groups(profile: String, load_balancer_arn: String) -> Result<Vec<TargetGroup>, String> {
    let client = create_elbv2_client(&profile).await;
    let resp = client.describe_target_groups().load_balancer_arn(&load_balancer_arn).send().await.map_err(|e| e.to_string())?;
    Ok(resp.target_groups().iter().map(|tg| TargetGroup {
        arn: tg.target_group_arn().unwrap_or_default().to_string(),
        name: tg.target_group_name().unwrap_or_default().to_string(),
        protocol: tg.protocol().map(|p| p.as_str().to_string()).unwrap_or_default(),
        port: tg.port().unwrap_or(0),
    }).collect())
}

#[derive(Serialize)]
pub struct TargetHealth {
    pub id: String,
    pub port: i32,
    pub state: String,
}

#[tauri::command]
pub async fn elbv2_list_target_health(profile: String, target_group_arn: String) -> Result<Vec<TargetHealth>, String> {
    let client = create_elbv2_client(&profile).await;
    let resp = client.describe_target_health().target_group_arn(&target_group_arn).send().await.map_err(|e| e.to_string())?;
    Ok(resp.target_health_descriptions().iter().map(|t| TargetHealth {
        id: t.target().and_then(|d| d.id()).unwrap_or_default().to_string(),
        port: t.target().and_then(|d| d.port()).unwrap_or(0),
        state: t.target_health().and_then(|h| h.state()).map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn elbv2_delete_load_balancer(profile: String, load_balancer_arn: String) -> Result<String, String> {
    let client = create_elbv2_client(&profile).await;
    client.delete_load_balancer().load_balancer_arn(&load_balancer_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Load balancer {} deleted", load_balancer_arn))
}
