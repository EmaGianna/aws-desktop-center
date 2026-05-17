use super::load_config;
use aws_sdk_cloudwatch::Client as CwClient;
use aws_sdk_cloudwatchlogs::Client as LogsClient;
use serde::Serialize;

#[derive(Serialize)]
pub struct CwAlarm {
    pub name: String,
    pub state: String,
    pub metric: String,
    pub namespace: String,
    pub comparison: String,
    pub threshold: f64,
    pub period: i32,
    pub evaluation_periods: i32,
    pub description: String,
    pub actions: Vec<String>,
    pub state_reason: String,
    pub state_updated: String,
}

#[derive(Serialize)]
pub struct LogGroup {
    pub name: String,
    pub stored_bytes: i64,
    pub retention_days: i32,
    pub creation_time: i64,
}

#[derive(Serialize)]
pub struct LogStream {
    pub name: String,
    pub last_event: i64,
    pub stored_bytes: i64,
}

#[derive(Serialize)]
pub struct LogEvent {
    pub timestamp: i64,
    pub message: String,
}

#[derive(Serialize)]
pub struct CwMetric {
    pub namespace: String,
    pub metric_name: String,
    pub dimensions: Vec<String>,
}

#[tauri::command]
pub async fn cw_list_alarms(profile: String) -> Result<Vec<CwAlarm>, String> {
    let config = load_config(&profile).await;
    let client = CwClient::new(&config);
    let resp = client.describe_alarms().send().await.map_err(|e| e.to_string())?;
    Ok(resp.metric_alarms().iter().map(|a| CwAlarm {
        name: a.alarm_name().unwrap_or_default().to_string(),
        state: a.state_value().map(|s| format!("{:?}", s)).unwrap_or_default(),
        metric: a.metric_name().unwrap_or_default().to_string(),
        namespace: a.namespace().unwrap_or_default().to_string(),
        comparison: a.comparison_operator().map(|c| format!("{:?}", c)).unwrap_or_default(),
        threshold: a.threshold().unwrap_or(0.0),
        period: a.period().unwrap_or(0),
        evaluation_periods: a.evaluation_periods().unwrap_or(0),
        description: a.alarm_description().unwrap_or_default().to_string(),
        actions: a.alarm_actions().iter().map(|s| s.to_string()).collect(),
        state_reason: a.state_reason().unwrap_or_default().to_string(),
        state_updated: a.state_updated_timestamp().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn cw_list_log_groups(profile: String) -> Result<Vec<LogGroup>, String> {
    let config = load_config(&profile).await;
    let client = LogsClient::new(&config);
    let mut all_groups = Vec::new();
    let mut token: Option<String> = None;

    loop {
        let mut req = client.describe_log_groups().limit(50);
        if let Some(t) = &token {
            req = req.next_token(t);
        }
        let resp = req.send().await.map_err(|e| e.to_string())?;
        for lg in resp.log_groups() {
            all_groups.push(LogGroup {
                name: lg.log_group_name().unwrap_or_default().to_string(),
                stored_bytes: lg.stored_bytes().unwrap_or(0),
                retention_days: lg.retention_in_days().unwrap_or(0),
                creation_time: lg.creation_time().unwrap_or(0),
            });
        }
        token = resp.next_token().map(|s| s.to_string());
        if token.is_none() { break; }
    }
    Ok(all_groups)
}

#[tauri::command]
pub async fn cw_list_log_streams(profile: String, log_group: String) -> Result<Vec<LogStream>, String> {
    let config = load_config(&profile).await;
    let client = LogsClient::new(&config);
    let resp = client.describe_log_streams()
        .log_group_name(&log_group)
        .order_by(aws_sdk_cloudwatchlogs::types::OrderBy::LastEventTime)
        .descending(true)
        .limit(20)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.log_streams().iter().map(|s| LogStream {
        name: s.log_stream_name().unwrap_or_default().to_string(),
        last_event: s.last_event_timestamp().unwrap_or(0),
        stored_bytes: 0,
    }).collect())
}

#[tauri::command]
pub async fn cw_get_log_events(profile: String, log_group: String, log_stream: String) -> Result<Vec<LogEvent>, String> {
    let config = load_config(&profile).await;
    let client = LogsClient::new(&config);
    let resp = client.get_log_events()
        .log_group_name(&log_group)
        .log_stream_name(&log_stream)
        .limit(100)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.events().iter().map(|e| LogEvent {
        timestamp: e.timestamp().unwrap_or(0),
        message: e.message().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn cw_filter_logs(profile: String, log_group: String, filter_pattern: String) -> Result<Vec<LogEvent>, String> {
    let config = load_config(&profile).await;
    let client = LogsClient::new(&config);
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
    let one_hour_ago = now - 3_600_000;

    let resp = client.filter_log_events()
        .log_group_name(&log_group)
        .filter_pattern(&filter_pattern)
        .start_time(one_hour_ago)
        .end_time(now)
        .limit(100)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.events().iter().map(|e| LogEvent {
        timestamp: e.timestamp().unwrap_or(0),
        message: e.message().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn cw_list_metrics(profile: String, namespace: String) -> Result<Vec<CwMetric>, String> {
    let config = load_config(&profile).await;
    let client = CwClient::new(&config);
    let mut req = client.list_metrics();
    if !namespace.is_empty() {
        req = req.namespace(&namespace);
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    Ok(resp.metrics().iter().take(200).map(|m| CwMetric {
        namespace: m.namespace().unwrap_or_default().to_string(),
        metric_name: m.metric_name().unwrap_or_default().to_string(),
        dimensions: m.dimensions().iter().map(|d| format!("{}={}", d.name().unwrap_or_default(), d.value().unwrap_or_default())).collect(),
    }).collect())
}
