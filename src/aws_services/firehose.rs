use super::load_config;
use aws_sdk_firehose::primitives::Blob;
use aws_sdk_firehose::Client;
use serde::Serialize;

pub async fn create_firehose_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct DeliveryStream {
    pub name: String,
    pub status: String,
    pub stream_type: String,
}

#[tauri::command]
pub async fn firehose_list_streams(profile: String) -> Result<Vec<DeliveryStream>, String> {
    let client = create_firehose_client(&profile).await;
    let resp = client.list_delivery_streams().send().await.map_err(|e| e.to_string())?;
    let mut streams = Vec::new();
    for name in resp.delivery_stream_names() {
        let detail = client.describe_delivery_stream().delivery_stream_name(name).send().await.map_err(|e| e.to_string())?;
        if let Some(d) = detail.delivery_stream_description() {
            streams.push(DeliveryStream {
                name: name.clone(),
                status: d.delivery_stream_status().as_str().to_string(),
                stream_type: d.delivery_stream_type().as_str().to_string(),
            });
        }
    }
    Ok(streams)
}

#[tauri::command]
pub async fn firehose_put_record(profile: String, delivery_stream_name: String, data: String) -> Result<String, String> {
    let client = create_firehose_client(&profile).await;
    let record = aws_sdk_firehose::types::Record::builder().data(Blob::new(data.into_bytes())).build().map_err(|e| e.to_string())?;
    let resp = client.put_record().delivery_stream_name(&delivery_stream_name).record(record).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Record ID: {}", resp.record_id()))
}

#[tauri::command]
pub async fn firehose_delete_stream(profile: String, delivery_stream_name: String) -> Result<String, String> {
    let client = create_firehose_client(&profile).await;
    client.delete_delivery_stream().delivery_stream_name(&delivery_stream_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Delivery stream {} deleted", delivery_stream_name))
}
