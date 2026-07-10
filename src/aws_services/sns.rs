use super::load_config;
use aws_sdk_sns::Client;
use serde::Serialize;

pub async fn create_sns_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct SnsTopic {
    pub arn: String,
    pub name: String,
}

#[tauri::command]
pub async fn sns_list_topics(profile: String) -> Result<Vec<SnsTopic>, String> {
    let client = create_sns_client(&profile).await;
    let resp = client.list_topics().send().await.map_err(|e| e.to_string())?;
    Ok(resp.topics().iter().filter_map(|t| {
        let arn = t.topic_arn()?.to_string();
        let name = arn.rsplit(':').next().unwrap_or(&arn).to_string();
        Some(SnsTopic { arn, name })
    }).collect())
}

#[tauri::command]
pub async fn sns_create_topic(profile: String, name: String) -> Result<String, String> {
    let client = create_sns_client(&profile).await;
    let resp = client.create_topic().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.topic_arn().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn sns_delete_topic(profile: String, topic_arn: String) -> Result<String, String> {
    let client = create_sns_client(&profile).await;
    client.delete_topic().topic_arn(&topic_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Topic {} deleted", topic_arn))
}

#[derive(Serialize)]
pub struct SnsSubscription {
    pub arn: String,
    pub protocol: String,
    pub endpoint: String,
}

#[tauri::command]
pub async fn sns_list_subscriptions(profile: String, topic_arn: String) -> Result<Vec<SnsSubscription>, String> {
    let client = create_sns_client(&profile).await;
    let resp = client.list_subscriptions_by_topic().topic_arn(&topic_arn).send().await.map_err(|e| e.to_string())?;
    Ok(resp.subscriptions().iter().map(|s| SnsSubscription {
        arn: s.subscription_arn().unwrap_or_default().to_string(),
        protocol: s.protocol().unwrap_or_default().to_string(),
        endpoint: s.endpoint().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn sns_subscribe(profile: String, topic_arn: String, protocol: String, endpoint: String) -> Result<String, String> {
    let client = create_sns_client(&profile).await;
    let resp = client.subscribe().topic_arn(&topic_arn).protocol(&protocol).endpoint(&endpoint).send().await.map_err(|e| e.to_string())?;
    Ok(resp.subscription_arn().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn sns_unsubscribe(profile: String, subscription_arn: String) -> Result<String, String> {
    let client = create_sns_client(&profile).await;
    client.unsubscribe().subscription_arn(&subscription_arn).send().await.map_err(|e| e.to_string())?;
    Ok("Unsubscribed".to_string())
}

#[tauri::command]
pub async fn sns_publish(profile: String, topic_arn: String, message: String, subject: String) -> Result<String, String> {
    let client = create_sns_client(&profile).await;
    let mut req = client.publish().topic_arn(&topic_arn).message(&message);
    if !subject.is_empty() {
        req = req.subject(&subject);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.message_id().unwrap_or_default().to_string())
}
