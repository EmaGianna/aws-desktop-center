use super::load_config;
use aws_sdk_cloudtrail::Client;
use serde::Serialize;

pub async fn create_cloudtrail_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Trail {
    pub name: String,
    pub arn: String,
    pub home_region: String,
    pub is_logging: bool,
}

#[tauri::command]
pub async fn cloudtrail_list_trails(profile: String) -> Result<Vec<Trail>, String> {
    let client = create_cloudtrail_client(&profile).await;
    let resp = client.list_trails().send().await.map_err(|e| e.to_string())?;
    let mut trails = Vec::new();
    for t in resp.trails() {
        let name = t.name().unwrap_or_default().to_string();
        let status = client.get_trail_status().name(&name).send().await.map_err(|e| e.to_string())?;
        trails.push(Trail {
            name,
            arn: t.trail_arn().unwrap_or_default().to_string(),
            home_region: t.home_region().unwrap_or_default().to_string(),
            is_logging: status.is_logging().unwrap_or(false),
        });
    }
    Ok(trails)
}

#[derive(Serialize)]
pub struct CloudTrailEvent {
    pub id: String,
    pub name: String,
    pub username: String,
    pub time: String,
}

#[tauri::command]
pub async fn cloudtrail_lookup_events(profile: String) -> Result<Vec<CloudTrailEvent>, String> {
    let client = create_cloudtrail_client(&profile).await;
    let resp = client.lookup_events().send().await.map_err(|e| e.to_string())?;
    Ok(resp.events().iter().map(|e| CloudTrailEvent {
        id: e.event_id().unwrap_or_default().to_string(),
        name: e.event_name().unwrap_or_default().to_string(),
        username: e.username().unwrap_or_default().to_string(),
        time: e.event_time().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}
