use super::load_config;
use aws_sdk_dynamodb::Client;
use aws_sdk_dynamodb::types::AttributeValue;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct TableDetail {
    pub name: String,
    pub status: String,
    pub item_count: i64,
    pub size_bytes: i64,
    pub partition_key: String,
    pub partition_key_type: String,
    pub sort_key: String,
    pub sort_key_type: String,
    pub gsi: Vec<IndexInfo>,
    pub lsi: Vec<IndexInfo>,
    pub billing_mode: String,
    pub creation_date: String,
}

#[derive(Serialize)]
pub struct IndexInfo {
    pub name: String,
    pub partition_key: String,
    pub sort_key: String,
}

#[derive(Serialize)]
pub struct ScanResult {
    pub items: Vec<HashMap<String, String>>,
    pub count: i32,
    pub has_more: bool,
}

fn attr_to_string(v: &AttributeValue) -> String {
    match v {
        AttributeValue::S(s) => s.clone(),
        AttributeValue::N(n) => n.clone(),
        AttributeValue::Bool(b) => b.to_string(),
        AttributeValue::Null(_) => "null".to_string(),
        AttributeValue::L(list) => format!("[{}]", list.iter().map(attr_to_string).collect::<Vec<_>>().join(", ")),
        AttributeValue::M(map) => format!("{{{}}}", map.iter().map(|(k, v)| format!("{}: {}", k, attr_to_string(v))).collect::<Vec<_>>().join(", ")),
        AttributeValue::Ss(ss) => format!("[{}]", ss.join(", ")),
        AttributeValue::Ns(ns) => format!("[{}]", ns.join(", ")),
        AttributeValue::B(b) => format!("<binary {} bytes>", b.as_ref().len()),
        _ => format!("{:?}", v),
    }
}

#[tauri::command]
pub async fn dynamo_list_tables(profile: String) -> Result<Vec<String>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_tables().send().await.map_err(|e| e.to_string())?;
    Ok(resp.table_names().to_vec())
}

#[tauri::command]
pub async fn describe_table(profile: String, table_name: String) -> Result<TableDetail, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.describe_table().table_name(&table_name).send().await.map_err(|e| e.to_string())?;
    let table = resp.table().ok_or("No table info")?;

    let key_schema = table.key_schema();
    let attr_defs = table.attribute_definitions();

    let mut partition_key = String::new();
    let mut partition_key_type = String::new();
    let mut sort_key = String::new();
    let mut sort_key_type = String::new();

    for ks in key_schema {
        let name = ks.attribute_name().to_string();
        let attr_type = attr_defs.iter()
            .find(|a| a.attribute_name() == ks.attribute_name())
            .map(|a| format!("{:?}", a.attribute_type()))
            .unwrap_or_default();
        match ks.key_type() {
            aws_sdk_dynamodb::types::KeyType::Hash => { partition_key = name; partition_key_type = attr_type; }
            aws_sdk_dynamodb::types::KeyType::Range => { sort_key = name; sort_key_type = attr_type; }
            _ => {}
        }
    }

    let gsi: Vec<IndexInfo> = table.global_secondary_indexes().iter().map(|idx| {
        let mut pk = String::new();
        let mut sk = String::new();
        for ks in idx.key_schema() {
            match ks.key_type() {
                aws_sdk_dynamodb::types::KeyType::Hash => pk = ks.attribute_name().to_string(),
                aws_sdk_dynamodb::types::KeyType::Range => sk = ks.attribute_name().to_string(),
                _ => {}
            }
        }
        IndexInfo { name: idx.index_name().unwrap_or_default().to_string(), partition_key: pk, sort_key: sk }
    }).collect();

    let lsi: Vec<IndexInfo> = table.local_secondary_indexes().iter().map(|idx| {
        let mut pk = String::new();
        let mut sk = String::new();
        for ks in idx.key_schema() {
            match ks.key_type() {
                aws_sdk_dynamodb::types::KeyType::Hash => pk = ks.attribute_name().to_string(),
                aws_sdk_dynamodb::types::KeyType::Range => sk = ks.attribute_name().to_string(),
                _ => {}
            }
        }
        IndexInfo { name: idx.index_name().unwrap_or_default().to_string(), partition_key: pk, sort_key: sk }
    }).collect();

    let billing_mode = table.billing_mode_summary()
        .and_then(|b| b.billing_mode())
        .map(|m| format!("{:?}", m))
        .unwrap_or_else(|| "PROVISIONED".to_string());

    Ok(TableDetail {
        name: table.table_name().unwrap_or_default().to_string(),
        status: table.table_status().map(|s| format!("{:?}", s)).unwrap_or_default(),
        item_count: table.item_count().unwrap_or(0),
        size_bytes: table.table_size_bytes().unwrap_or(0),
        partition_key,
        partition_key_type,
        sort_key,
        sort_key_type,
        gsi,
        lsi,
        billing_mode,
        creation_date: table.creation_date_time().map(|d| d.to_string()).unwrap_or_default(),
    })
}

#[tauri::command]
pub async fn scan_table(profile: String, table_name: String, limit: i32) -> Result<ScanResult, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.scan().table_name(&table_name).limit(limit).send().await.map_err(|e| e.to_string())?;
    let items: Vec<HashMap<String, String>> = resp.items().iter().map(|item| {
        item.iter().map(|(k, v)| (k.clone(), attr_to_string(v))).collect()
    }).collect();
    Ok(ScanResult { items, count: resp.count(), has_more: resp.last_evaluated_key().is_some() })
}

#[tauri::command]
pub async fn dynamo_query_table(profile: String, table_name: String, partition_key_name: String, partition_key_value: String, sort_key_name: String, sort_key_value: String, limit: i32) -> Result<ScanResult, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);

    let has_sk = !sort_key_name.is_empty() && !sort_key_value.is_empty();
    let expr = if has_sk { "#pk = :pkval AND begins_with(#sk, :skval)" } else { "#pk = :pkval" };

    let mut req = client.query()
        .table_name(&table_name)
        .limit(limit)
        .key_condition_expression(expr)
        .expression_attribute_names("#pk", &partition_key_name)
        .expression_attribute_values(":pkval", AttributeValue::S(partition_key_value));

    if has_sk {
        req = req
            .expression_attribute_names("#sk", &sort_key_name)
            .expression_attribute_values(":skval", AttributeValue::S(sort_key_value));
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let items: Vec<HashMap<String, String>> = resp.items().iter().map(|item| {
        item.iter().map(|(k, v)| (k.clone(), attr_to_string(v))).collect()
    }).collect();

    Ok(ScanResult { items, count: resp.count(), has_more: resp.last_evaluated_key().is_some() })
}
