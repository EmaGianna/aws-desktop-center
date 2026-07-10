use super::load_config;
use aws_sdk_kinesis::primitives::Blob;
use aws_sdk_kinesis::Client;
use serde::Serialize;

pub async fn create_kinesis_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct KinesisStream {
    pub name: String,
    pub status: String,
    pub shard_count: i32,
    pub retention_hours: i32,
    pub arn: String,
}

#[tauri::command]
pub async fn kinesis_list_streams(profile: String) -> Result<Vec<KinesisStream>, String> {
    let client = create_kinesis_client(&profile).await;
    let resp = client.list_streams().send().await.map_err(|e| e.to_string())?;
    let mut streams = Vec::new();
    for name in resp.stream_names() {
        let summary = client.describe_stream_summary().stream_name(name).send().await.map_err(|e| e.to_string())?;
        if let Some(s) = summary.stream_description_summary() {
            streams.push(KinesisStream {
                name: name.clone(),
                status: s.stream_status().as_str().to_string(),
                shard_count: s.open_shard_count(),
                retention_hours: s.retention_period_hours(),
                arn: s.stream_arn().to_string(),
            });
        }
    }
    Ok(streams)
}

#[tauri::command]
pub async fn kinesis_create_stream(profile: String, stream_name: String, shard_count: i32) -> Result<String, String> {
    let client = create_kinesis_client(&profile).await;
    client.create_stream().stream_name(&stream_name).shard_count(shard_count).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Stream {} creating", stream_name))
}

#[tauri::command]
pub async fn kinesis_delete_stream(profile: String, stream_name: String) -> Result<String, String> {
    let client = create_kinesis_client(&profile).await;
    client.delete_stream().stream_name(&stream_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Stream {} deleting", stream_name))
}

#[tauri::command]
pub async fn kinesis_put_record(profile: String, stream_name: String, data: String, partition_key: String) -> Result<String, String> {
    let client = create_kinesis_client(&profile).await;
    let resp = client.put_record()
        .stream_name(&stream_name)
        .data(Blob::new(data.into_bytes()))
        .partition_key(&partition_key)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Sequence number: {}, Shard: {}", resp.sequence_number(), resp.shard_id()))
}

#[derive(Serialize)]
pub struct KinesisRecord {
    pub partition_key: String,
    pub sequence_number: String,
    pub data: String,
}

#[tauri::command]
pub async fn kinesis_get_records(profile: String, stream_name: String) -> Result<Vec<KinesisRecord>, String> {
    let client = create_kinesis_client(&profile).await;
    let shards_resp = client.list_shards().stream_name(&stream_name).send().await.map_err(|e| e.to_string())?;
    let shard_id = shards_resp.shards().first().and_then(|s| Some(s.shard_id())).ok_or("No shards available")?.to_string();

    let iter_resp = client.get_shard_iterator()
        .stream_name(&stream_name)
        .shard_id(&shard_id)
        .shard_iterator_type(aws_sdk_kinesis::types::ShardIteratorType::TrimHorizon)
        .send().await.map_err(|e| e.to_string())?;
    let shard_iterator = iter_resp.shard_iterator().ok_or("No shard iterator returned")?;

    let records_resp = client.get_records().shard_iterator(shard_iterator).send().await.map_err(|e| e.to_string())?;
    Ok(records_resp.records().iter().map(|r| KinesisRecord {
        partition_key: r.partition_key().to_string(),
        sequence_number: r.sequence_number().to_string(),
        data: String::from_utf8_lossy(r.data().as_ref()).to_string(),
    }).collect())
}
