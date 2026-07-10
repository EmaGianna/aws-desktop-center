use super::load_config;
use aws_sdk_ec2::Client;
use aws_sdk_ec2::types::Tag;
use serde::Serialize;
use std::collections::HashMap;

pub async fn create_ec2_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

fn tags_to_map(tags: &[Tag]) -> HashMap<String, String> {
    tags.iter()
        .filter_map(|t| Some((t.key()?.to_string(), t.value().unwrap_or_default().to_string())))
        .collect()
}

fn tag_name(tags: &[Tag]) -> String {
    tags.iter()
        .find(|t| t.key() == Some("Name"))
        .and_then(|t| t.value())
        .unwrap_or_default()
        .to_string()
}

// ---------- Instances ----------

#[derive(Serialize)]
pub struct Ec2Instance {
    pub id: String,
    pub name: String,
    pub instance_type: String,
    pub state: String,
    pub public_ip: String,
    pub private_ip: String,
    pub availability_zone: String,
    pub vpc_id: String,
    pub subnet_id: String,
    pub image_id: String,
    pub key_name: String,
    pub launch_time: String,
    pub tags: HashMap<String, String>,
}

#[tauri::command]
pub async fn ec2_list_instances(profile: String) -> Result<Vec<Ec2Instance>, String> {
    let client = create_ec2_client(&profile).await;
    let resp = client.describe_instances().send().await.map_err(|e| e.to_string())?;

    let mut instances = Vec::new();
    for reservation in resp.reservations() {
        for i in reservation.instances() {
            instances.push(Ec2Instance {
                id: i.instance_id().unwrap_or_default().to_string(),
                name: tag_name(i.tags()),
                instance_type: i.instance_type().map(|t| t.as_str().to_string()).unwrap_or_default(),
                state: i.state().and_then(|s| s.name()).map(|n| n.as_str().to_string()).unwrap_or_default(),
                public_ip: i.public_ip_address().unwrap_or_default().to_string(),
                private_ip: i.private_ip_address().unwrap_or_default().to_string(),
                availability_zone: i.placement().and_then(|p| p.availability_zone()).unwrap_or_default().to_string(),
                vpc_id: i.vpc_id().unwrap_or_default().to_string(),
                subnet_id: i.subnet_id().unwrap_or_default().to_string(),
                image_id: i.image_id().unwrap_or_default().to_string(),
                key_name: i.key_name().unwrap_or_default().to_string(),
                launch_time: i.launch_time().map(|d| d.to_string()).unwrap_or_default(),
                tags: tags_to_map(i.tags()),
            });
        }
    }
    Ok(instances)
}

#[tauri::command]
pub async fn ec2_start_instance(profile: String, instance_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.start_instances().instance_ids(&instance_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Starting {}", instance_id))
}

#[tauri::command]
pub async fn ec2_stop_instance(profile: String, instance_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.stop_instances().instance_ids(&instance_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Stopping {}", instance_id))
}

#[tauri::command]
pub async fn ec2_reboot_instance(profile: String, instance_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.reboot_instances().instance_ids(&instance_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Rebooting {}", instance_id))
}

#[tauri::command]
pub async fn ec2_terminate_instance(profile: String, instance_id: String) -> Result<String, String> {
    let client = create_ec2_client(&profile).await;
    client.terminate_instances().instance_ids(&instance_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Terminating {}", instance_id))
}

// ---------- Networking (VPC / Subnets / Security Groups / Route Tables) ----------

#[derive(Serialize)]
pub struct Vpc {
    pub id: String,
    pub name: String,
    pub cidr_block: String,
    pub is_default: bool,
    pub state: String,
}

#[tauri::command]
pub async fn ec2_list_vpcs(profile: String) -> Result<Vec<Vpc>, String> {
    let client = create_ec2_client(&profile).await;
    let resp = client.describe_vpcs().send().await.map_err(|e| e.to_string())?;
    Ok(resp.vpcs().iter().map(|v| Vpc {
        id: v.vpc_id().unwrap_or_default().to_string(),
        name: tag_name(v.tags()),
        cidr_block: v.cidr_block().unwrap_or_default().to_string(),
        is_default: v.is_default().unwrap_or(false),
        state: v.state().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct Subnet {
    pub id: String,
    pub name: String,
    pub vpc_id: String,
    pub cidr_block: String,
    pub availability_zone: String,
    pub available_ips: i32,
    pub map_public_ip: bool,
}

#[tauri::command]
pub async fn ec2_list_subnets(profile: String, vpc_id: String) -> Result<Vec<Subnet>, String> {
    let client = create_ec2_client(&profile).await;
    let mut req = client.describe_subnets();
    if !vpc_id.is_empty() {
        req = req.filters(aws_sdk_ec2::types::Filter::builder().name("vpc-id").values(&vpc_id).build());
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.subnets().iter().map(|s| Subnet {
        id: s.subnet_id().unwrap_or_default().to_string(),
        name: tag_name(s.tags()),
        vpc_id: s.vpc_id().unwrap_or_default().to_string(),
        cidr_block: s.cidr_block().unwrap_or_default().to_string(),
        availability_zone: s.availability_zone().unwrap_or_default().to_string(),
        available_ips: s.available_ip_address_count().unwrap_or(0),
        map_public_ip: s.map_public_ip_on_launch().unwrap_or(false),
    }).collect())
}

#[derive(Serialize)]
pub struct SecurityGroupRule {
    pub protocol: String,
    pub from_port: i32,
    pub to_port: i32,
    pub cidr_ranges: Vec<String>,
}

#[derive(Serialize)]
pub struct SecurityGroup {
    pub id: String,
    pub name: String,
    pub description: String,
    pub vpc_id: String,
    pub inbound_rules: Vec<SecurityGroupRule>,
    pub outbound_rules: Vec<SecurityGroupRule>,
}

fn map_rules(perms: &[aws_sdk_ec2::types::IpPermission]) -> Vec<SecurityGroupRule> {
    perms.iter().map(|p| SecurityGroupRule {
        protocol: p.ip_protocol().unwrap_or("-1").to_string(),
        from_port: p.from_port().unwrap_or(-1),
        to_port: p.to_port().unwrap_or(-1),
        cidr_ranges: p.ip_ranges().iter().filter_map(|r| r.cidr_ip().map(|c| c.to_string())).collect(),
    }).collect()
}

#[tauri::command]
pub async fn ec2_list_security_groups(profile: String, vpc_id: String) -> Result<Vec<SecurityGroup>, String> {
    let client = create_ec2_client(&profile).await;
    let mut req = client.describe_security_groups();
    if !vpc_id.is_empty() {
        req = req.filters(aws_sdk_ec2::types::Filter::builder().name("vpc-id").values(&vpc_id).build());
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.security_groups().iter().map(|sg| SecurityGroup {
        id: sg.group_id().unwrap_or_default().to_string(),
        name: sg.group_name().unwrap_or_default().to_string(),
        description: sg.description().unwrap_or_default().to_string(),
        vpc_id: sg.vpc_id().unwrap_or_default().to_string(),
        inbound_rules: map_rules(sg.ip_permissions()),
        outbound_rules: map_rules(sg.ip_permissions_egress()),
    }).collect())
}

#[derive(Serialize)]
pub struct RouteTable {
    pub id: String,
    pub vpc_id: String,
    pub is_main: bool,
    pub route_count: usize,
}

#[tauri::command]
pub async fn ec2_list_route_tables(profile: String, vpc_id: String) -> Result<Vec<RouteTable>, String> {
    let client = create_ec2_client(&profile).await;
    let mut req = client.describe_route_tables();
    if !vpc_id.is_empty() {
        req = req.filters(aws_sdk_ec2::types::Filter::builder().name("vpc-id").values(&vpc_id).build());
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.route_tables().iter().map(|rt| RouteTable {
        id: rt.route_table_id().unwrap_or_default().to_string(),
        vpc_id: rt.vpc_id().unwrap_or_default().to_string(),
        is_main: rt.associations().iter().any(|a| a.main().unwrap_or(false)),
        route_count: rt.routes().len(),
    }).collect())
}
