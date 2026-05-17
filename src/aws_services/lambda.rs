use super::load_config;
use aws_sdk_lambda::Client;
use aws_sdk_lambda::primitives::Blob;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct LambdaFunction {
    pub name: String,
    pub runtime: String,
    pub handler: String,
    pub memory: i32,
    pub timeout: i32,
    pub code_size: i64,
    pub description: String,
    pub role: String,
    pub last_modified: String,
    pub architectures: Vec<String>,
    pub layers: Vec<LambdaLayer>,
    pub env_vars: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct LambdaLayer {
    pub arn: String,
    pub size: i64,
}

#[derive(Serialize)]
pub struct LambdaInvokeResult {
    pub status_code: i32,
    pub payload: String,
    pub error: String,
}

#[tauri::command]
pub async fn lambda_list_functions(profile: String) -> Result<Vec<LambdaFunction>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let mut all_functions = Vec::new();
    let mut marker: Option<String> = None;

    loop {
        let mut req = client.list_functions();
        if let Some(m) = &marker {
            req = req.marker(m);
        }
        let resp = req.send().await.map_err(|e| e.to_string())?;
        for f in resp.functions() {
            let layers: Vec<LambdaLayer> = f.layers().iter().map(|l| LambdaLayer {
                arn: l.arn().unwrap_or_default().to_string(),
                size: l.code_size(),
            }).collect();
            let env_vars: HashMap<String, String> = f.environment()
                .and_then(|e| e.variables())
                .map(|v| v.iter().map(|(k, val)| (k.clone(), val.clone())).collect())
                .unwrap_or_default();
            all_functions.push(LambdaFunction {
                name: f.function_name().unwrap_or_default().to_string(),
                runtime: f.runtime().map(|r| format!("{:?}", r)).unwrap_or_else(|| "N/A".to_string()),
                handler: f.handler().unwrap_or_default().to_string(),
                memory: f.memory_size().unwrap_or(0),
                timeout: f.timeout().unwrap_or(0),
                code_size: f.code_size(),
                description: f.description().unwrap_or_default().to_string(),
                role: f.role().unwrap_or_default().to_string(),
                last_modified: f.last_modified().unwrap_or_default().to_string(),
                architectures: f.architectures().iter().map(|a| format!("{:?}", a)).collect(),
                layers,
                env_vars,
            });
        }
        marker = resp.next_marker().map(|s| s.to_string());
        if marker.is_none() { break; }
    }
    Ok(all_functions)
}

#[tauri::command]
pub async fn lambda_get_function_code(profile: String, function_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_function().function_name(&function_name)
        .send().await.map_err(|e| e.to_string())?;
    let location = resp.code()
        .and_then(|c| c.location())
        .ok_or("No code location available")?;
    Ok(location.to_string())
}

#[tauri::command]
pub async fn lambda_invoke(profile: String, function_name: String, payload: String) -> Result<LambdaInvokeResult, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);

    let blob = if payload.is_empty() {
        Blob::new("{}")
    } else {
        Blob::new(payload.as_bytes().to_vec())
    };

    let resp = client.invoke()
        .function_name(&function_name)
        .payload(blob)
        .send().await.map_err(|e| e.to_string())?;

    let status_code = resp.status_code();
    let response_payload = resp.payload()
        .map(|p| String::from_utf8_lossy(p.as_ref()).to_string())
        .unwrap_or_default();
    let error = resp.function_error().unwrap_or_default().to_string();

    Ok(LambdaInvokeResult {
        status_code,
        payload: response_payload,
        error,
    })
}

#[tauri::command]
pub async fn lambda_get_recent_logs(profile: String, function_name: String) -> Result<Vec<String>, String> {
    let config = load_config(&profile).await;
    let client = aws_sdk_cloudwatchlogs::Client::new(&config);
    let log_group = format!("/aws/lambda/{}", function_name);

    let streams = client.describe_log_streams()
        .log_group_name(&log_group)
        .order_by(aws_sdk_cloudwatchlogs::types::OrderBy::LastEventTime)
        .descending(true)
        .limit(3)
        .send().await.map_err(|e| e.to_string())?;

    let mut all_events = Vec::new();
    for stream in streams.log_streams().iter().take(2) {
        let stream_name = stream.log_stream_name().unwrap_or_default();
        let events = client.get_log_events()
            .log_group_name(&log_group)
            .log_stream_name(stream_name)
            .limit(50)
            .send().await.map_err(|e| e.to_string())?;
        for event in events.events() {
            all_events.push(event.message().unwrap_or_default().to_string());
        }
    }
    Ok(all_events)
}

#[tauri::command]
pub async fn lambda_download_and_extract(_profile: String, _function_name: String, code_url: String) -> Result<String, String> {
    // Download the zip from the presigned URL
    let resp = reqwest::get(&code_url).await.map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    // Extract zip in memory
    let reader = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader).map_err(|e| e.to_string())?;

    let mut source = String::new();
    let num_files = archive.len();
    for i in 0..num_files {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();
        if file.is_dir() { continue; }
        let ext = name.rsplit('.').next().unwrap_or("");
        let is_text = matches!(ext, "py" | "js" | "ts" | "java" | "go" | "rs" | "rb" | "sh" | "txt" | "json" | "yaml" | "yml" | "toml" | "cfg" | "ini" | "xml" | "html" | "css" | "sql" | "md" | "mjs" | "cjs");
        if !is_text && num_files > 1 { continue; }

        source.push_str(&format!("// === {} ===\n", name));
        let mut content = String::new();
        use std::io::Read;
        file.read_to_string(&mut content).unwrap_or_default();
        source.push_str(&content);
        source.push_str("\n\n");
    }

    if source.is_empty() {
        return Err("No readable source files found in the deployment package".to_string());
    }
    Ok(source)
}
