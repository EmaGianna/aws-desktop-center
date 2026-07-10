use super::load_config;
use aws_sdk_sqs::Client;
use aws_sdk_sqs::types::QueueAttributeName;
use serde::Serialize;

pub async fn create_sqs_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct SqsQueue {
    pub url: String,
    pub name: String,
    pub approximate_messages: String,
    pub fifo: bool,
}

#[tauri::command]
pub async fn sqs_list_queues(profile: String) -> Result<Vec<SqsQueue>, String> {
    let client = create_sqs_client(&profile).await;
    let resp = client.list_queues().send().await.map_err(|e| e.to_string())?;
    let mut queues = Vec::new();
    for url in resp.queue_urls() {
        let name = url.rsplit('/').next().unwrap_or(url).to_string();
        let attrs = client.get_queue_attributes()
            .queue_url(url)
            .attribute_names(QueueAttributeName::ApproximateNumberOfMessages)
            .attribute_names(QueueAttributeName::FifoQueue)
            .send().await.map_err(|e| e.to_string())?;
        let map = attrs.attributes();
        queues.push(SqsQueue {
            url: url.clone(),
            fifo: name.ends_with(".fifo"),
            approximate_messages: map
                .and_then(|m| m.get(&QueueAttributeName::ApproximateNumberOfMessages))
                .cloned()
                .unwrap_or_else(|| "0".to_string()),
            name,
        });
    }
    Ok(queues)
}

#[tauri::command]
pub async fn sqs_create_queue(profile: String, name: String, fifo: bool) -> Result<String, String> {
    let client = create_sqs_client(&profile).await;
    let mut req = client.create_queue().queue_name(&name);
    if fifo {
        req = req.attributes(QueueAttributeName::FifoQueue, "true");
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.queue_url().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn sqs_delete_queue(profile: String, queue_url: String) -> Result<String, String> {
    let client = create_sqs_client(&profile).await;
    client.delete_queue().queue_url(&queue_url).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Queue {} deleted", queue_url))
}

#[tauri::command]
pub async fn sqs_send_message(profile: String, queue_url: String, message_body: String) -> Result<String, String> {
    let client = create_sqs_client(&profile).await;
    let resp = client.send_message().queue_url(&queue_url).message_body(&message_body).send().await.map_err(|e| e.to_string())?;
    Ok(resp.message_id().unwrap_or_default().to_string())
}

#[derive(Serialize)]
pub struct SqsMessage {
    pub id: String,
    pub body: String,
    pub receipt_handle: String,
}

#[tauri::command]
pub async fn sqs_receive_messages(profile: String, queue_url: String) -> Result<Vec<SqsMessage>, String> {
    let client = create_sqs_client(&profile).await;
    let resp = client.receive_message().queue_url(&queue_url).max_number_of_messages(10).send().await.map_err(|e| e.to_string())?;
    Ok(resp.messages().iter().map(|m| SqsMessage {
        id: m.message_id().unwrap_or_default().to_string(),
        body: m.body().unwrap_or_default().to_string(),
        receipt_handle: m.receipt_handle().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn sqs_delete_message(profile: String, queue_url: String, receipt_handle: String) -> Result<String, String> {
    let client = create_sqs_client(&profile).await;
    client.delete_message().queue_url(&queue_url).receipt_handle(&receipt_handle).send().await.map_err(|e| e.to_string())?;
    Ok("Message deleted".to_string())
}

#[tauri::command]
pub async fn sqs_purge_queue(profile: String, queue_url: String) -> Result<String, String> {
    let client = create_sqs_client(&profile).await;
    client.purge_queue().queue_url(&queue_url).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Queue {} purged", queue_url))
}
