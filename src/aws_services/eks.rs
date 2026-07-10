use super::load_config;
use aws_sdk_eks::Client;
use serde::Serialize;

pub async fn create_eks_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct EksCluster {
    pub name: String,
    pub arn: String,
    pub status: String,
    pub version: String,
    pub endpoint: String,
    pub platform_version: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn eks_list_clusters(profile: String) -> Result<Vec<EksCluster>, String> {
    let client = create_eks_client(&profile).await;
    let names_resp = client.list_clusters().send().await.map_err(|e| e.to_string())?;
    let mut clusters = Vec::new();
    for name in names_resp.clusters() {
        let resp = client.describe_cluster().name(name).send().await.map_err(|e| e.to_string())?;
        if let Some(c) = resp.cluster() {
            clusters.push(EksCluster {
                name: c.name().unwrap_or_default().to_string(),
                arn: c.arn().unwrap_or_default().to_string(),
                status: c.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
                version: c.version().unwrap_or_default().to_string(),
                endpoint: c.endpoint().unwrap_or_default().to_string(),
                platform_version: c.platform_version().unwrap_or_default().to_string(),
                created_at: c.created_at().map(|d| d.to_string()).unwrap_or_default(),
            });
        }
    }
    Ok(clusters)
}

#[derive(Serialize)]
pub struct EksNodegroup {
    pub name: String,
    pub status: String,
    pub instance_types: Vec<String>,
    pub min_size: i32,
    pub max_size: i32,
    pub desired_size: i32,
}

#[tauri::command]
pub async fn eks_list_nodegroups(profile: String, cluster_name: String) -> Result<Vec<EksNodegroup>, String> {
    let client = create_eks_client(&profile).await;
    let names_resp = client.list_nodegroups().cluster_name(&cluster_name).send().await.map_err(|e| e.to_string())?;
    let mut groups = Vec::new();
    for name in names_resp.nodegroups() {
        let resp = client.describe_nodegroup().cluster_name(&cluster_name).nodegroup_name(name).send().await.map_err(|e| e.to_string())?;
        if let Some(ng) = resp.nodegroup() {
            let scaling = ng.scaling_config();
            groups.push(EksNodegroup {
                name: ng.nodegroup_name().unwrap_or_default().to_string(),
                status: ng.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
                instance_types: ng.instance_types().to_vec(),
                min_size: scaling.and_then(|s| s.min_size()).unwrap_or(0),
                max_size: scaling.and_then(|s| s.max_size()).unwrap_or(0),
                desired_size: scaling.and_then(|s| s.desired_size()).unwrap_or(0),
            });
        }
    }
    Ok(groups)
}
