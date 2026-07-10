use super::load_config;
use aws_sdk_dynamodbstreams::Client;
use serde::Serialize;

pub async fn create_streams_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct DynamoStream {
    pub arn: String,
    pub label: String,
}

#[tauri::command]
pub async fn dynamo_streams_list(profile: String, table_name: String) -> Result<Vec<DynamoStream>, String> {
    let client = create_streams_client(&profile).await;
    let resp = client.list_streams().table_name(&table_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.streams().iter().map(|s| DynamoStream {
        arn: s.stream_arn().unwrap_or_default().to_string(),
        label: s.stream_label().unwrap_or_default().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct StreamRecord {
    pub event_name: String,
    pub keys: String,
    pub new_image: String,
}

#[tauri::command]
pub async fn dynamo_streams_get_records(profile: String, stream_arn: String) -> Result<Vec<StreamRecord>, String> {
    let client = create_streams_client(&profile).await;
    let desc = client.describe_stream().stream_arn(&stream_arn).send().await.map_err(|e| e.to_string())?;
    let shard_id = desc.stream_description()
        .and_then(|d| d.shards().last())
        .and_then(|s| s.shard_id())
        .ok_or("No shards available on this stream")?
        .to_string();

    let iter_resp = client.get_shard_iterator()
        .stream_arn(&stream_arn)
        .shard_id(&shard_id)
        .shard_iterator_type(aws_sdk_dynamodbstreams::types::ShardIteratorType::TrimHorizon)
        .send().await.map_err(|e| e.to_string())?;
    let shard_iterator = iter_resp.shard_iterator().ok_or("No shard iterator returned")?;

    let records_resp = client.get_records().shard_iterator(shard_iterator).send().await.map_err(|e| e.to_string())?;
    Ok(records_resp.records().iter().map(|r| {
        let dynamodb = r.dynamodb();
        StreamRecord {
            event_name: r.event_name().map(|e| e.as_str().to_string()).unwrap_or_default(),
            keys: dynamodb.and_then(|d| d.keys()).map(|k| format!("{:?}", k)).unwrap_or_default(),
            new_image: dynamodb.and_then(|d| d.new_image()).map(|i| format!("{:?}", i)).unwrap_or_default(),
        }
    }).collect())
}
