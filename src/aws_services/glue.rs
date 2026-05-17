use super::load_config;
use aws_sdk_glue::Client;
use aws_sdk_s3::Client as S3Client;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct GlueTrigger {
    pub name: String,
    pub trigger_type: String,
    pub state: String,
    pub schedule: String,
    pub actions: Vec<String>,
    pub description: String,
}

#[derive(Serialize)]
pub struct GlueDatabase {
    pub name: String,
    pub description: String,
    pub location: String,
}

#[derive(Serialize)]
pub struct GlueTable {
    pub name: String,
    pub location: String,
    pub input_format: String,
    pub output_format: String,
    pub serde: String,
    pub columns: Vec<GlueColumn>,
    pub partition_keys: Vec<GlueColumn>,
    pub create_time: String,
}

#[derive(Serialize)]
pub struct GlueColumn {
    pub name: String,
    pub col_type: String,
    pub comment: String,
}

#[derive(Serialize)]
pub struct GlueJob {
    pub name: String,
    pub command_name: String,
    pub script_location: String,
    pub python_version: String,
    pub glue_version: String,
    pub max_capacity: f64,
    pub worker_type: String,
    pub num_workers: i32,
    pub timeout: i32,
    pub max_retries: i32,
    pub last_modified: String,
    pub default_arguments: HashMap<String, String>,
}

#[derive(Serialize)]
pub struct GlueCrawler {
    pub name: String,
    pub state: String,
    pub database_name: String,
    pub schedule: String,
    pub targets: Vec<String>,
    pub last_crawl_status: String,
    pub last_crawl_time: String,
    pub last_crawl_duration: i64,
}

#[derive(Serialize)]
pub struct GlueJobRun {
    pub id: String,
    pub status: String,
    pub started: String,
    pub completed: String,
    pub duration: i32,
    pub error_message: String,
}

#[tauri::command]
pub async fn glue_list_databases(profile: String) -> Result<Vec<GlueDatabase>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_databases().send().await.map_err(|e| e.to_string())?;
    Ok(resp.database_list().iter().map(|db| GlueDatabase {
        name: db.name().to_string(),
        description: db.description().unwrap_or_default().to_string(),
        location: db.location_uri().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn glue_list_tables(profile: String, database_name: String) -> Result<Vec<GlueTable>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_tables().database_name(&database_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.table_list().iter().map(|t| {
        let sd = t.storage_descriptor();
        let columns: Vec<GlueColumn> = sd.map(|s| s.columns().iter().map(|c| GlueColumn {
            name: c.name().to_string(),
            col_type: c.r#type().unwrap_or_default().to_string(),
            comment: c.comment().unwrap_or_default().to_string(),
        }).collect()).unwrap_or_default();
        let partition_keys: Vec<GlueColumn> = t.partition_keys().iter().map(|c| GlueColumn {
            name: c.name().to_string(),
            col_type: c.r#type().unwrap_or_default().to_string(),
            comment: c.comment().unwrap_or_default().to_string(),
        }).collect();
        GlueTable {
            name: t.name().to_string(),
            location: sd.and_then(|s| s.location()).unwrap_or_default().to_string(),
            input_format: sd.and_then(|s| s.input_format()).unwrap_or_default().to_string(),
            output_format: sd.and_then(|s| s.output_format()).unwrap_or_default().to_string(),
            serde: sd.and_then(|s| s.serde_info()).and_then(|si| si.serialization_library()).unwrap_or_default().to_string(),
            columns,
            partition_keys,
            create_time: t.create_time().map(|d| d.to_string()).unwrap_or_default(),
        }
    }).collect())
}

#[tauri::command]
pub async fn glue_list_jobs(profile: String) -> Result<Vec<GlueJob>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_jobs().send().await.map_err(|e| e.to_string())?;
    Ok(resp.jobs().iter().map(|j| {
        let cmd = j.command();
        GlueJob {
            name: j.name().unwrap_or_default().to_string(),
            command_name: cmd.map(|c| c.name().unwrap_or_default().to_string()).unwrap_or_default(),
            script_location: cmd.map(|c| c.script_location().unwrap_or_default().to_string()).unwrap_or_default(),
            python_version: cmd.map(|c| c.python_version().unwrap_or_default().to_string()).unwrap_or_default(),
            glue_version: j.glue_version().unwrap_or_default().to_string(),
            max_capacity: j.max_capacity().unwrap_or(0.0),
            worker_type: j.worker_type().map(|w| format!("{:?}", w)).unwrap_or_default(),
            num_workers: j.number_of_workers().unwrap_or(0),
            timeout: j.timeout().unwrap_or(0),
            max_retries: j.max_retries(),
            last_modified: j.last_modified_on().map(|d| d.to_string()).unwrap_or_default(),
            default_arguments: j.default_arguments().map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect()).unwrap_or_default(),
        }
    }).collect())
}

#[tauri::command]
pub async fn glue_list_crawlers(profile: String) -> Result<Vec<GlueCrawler>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_crawlers().send().await.map_err(|e| e.to_string())?;
    Ok(resp.crawlers().iter().map(|c| {
        let targets: Vec<String> = c.targets().map(|t| {
            t.s3_targets().iter().map(|s| s.path().unwrap_or_default().to_string()).collect()
        }).unwrap_or_default();
        let last_crawl = c.last_crawl();
        GlueCrawler {
            name: c.name().unwrap_or_default().to_string(),
            state: format!("{:?}", c.state()),
            database_name: c.database_name().unwrap_or_default().to_string(),
            schedule: c.schedule().and_then(|s| s.schedule_expression()).unwrap_or_default().to_string(),
            targets,
            last_crawl_status: last_crawl.and_then(|l| l.status()).map(|s| format!("{:?}", s)).unwrap_or_default(),
            last_crawl_time: last_crawl.and_then(|l| l.start_time()).map(|d| d.to_string()).unwrap_or_default(),
            last_crawl_duration: 0,
        }
    }).collect())
}

#[tauri::command]
pub async fn glue_get_job_runs(profile: String, job_name: String) -> Result<Vec<GlueJobRun>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_job_runs().job_name(&job_name).max_results(20).send().await.map_err(|e| e.to_string())?;
    Ok(resp.job_runs().iter().map(|r| GlueJobRun {
        id: r.id().unwrap_or_default().to_string(),
        status: r.job_run_state().map(|s| format!("{:?}", s)).unwrap_or_default(),
        started: r.started_on().map(|d| d.to_string()).unwrap_or_default(),
        completed: r.completed_on().map(|d| d.to_string()).unwrap_or_default(),
        duration: r.execution_time(),
        error_message: r.error_message().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn glue_start_job(profile: String, job_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.start_job_run().job_name(&job_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.job_run_id().unwrap_or_default().to_string())
}

#[tauri::command]
pub async fn glue_start_crawler(profile: String, crawler_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.start_crawler().name(&crawler_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Crawler {} started", crawler_name))
}

#[tauri::command]
pub async fn glue_get_job_script(profile: String, script_location: String) -> Result<String, String> {
    // script_location is like s3://bucket/path/to/script.py
    let config = load_config(&profile).await;
    let s3_client = S3Client::new(&config);

    let location = script_location.strip_prefix("s3://").ok_or("Invalid S3 path")?;
    let (bucket, key) = location.split_once('/').ok_or("Invalid S3 path format")?;

    let resp = s3_client.get_object().bucket(bucket).key(key)
        .send().await.map_err(|e| e.to_string())?;
    let bytes = resp.body.collect().await.map_err(|e| e.to_string())?;
    String::from_utf8(bytes.into_bytes().to_vec()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn glue_list_triggers(profile: String) -> Result<Vec<GlueTrigger>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_triggers().send().await.map_err(|e| e.to_string())?;
    Ok(resp.triggers().iter().map(|t| {
        let actions: Vec<String> = t.actions().iter().map(|a| {
            a.job_name().unwrap_or_default().to_string()
        }).collect();
        GlueTrigger {
            name: t.name().unwrap_or_default().to_string(),
            trigger_type: t.r#type().map(|ty| format!("{:?}", ty)).unwrap_or_default(),
            state: t.state().map(|s| format!("{:?}", s)).unwrap_or_default(),
            schedule: t.schedule().unwrap_or_default().to_string(),
            actions,
            description: t.description().unwrap_or_default().to_string(),
        }
    }).collect())
}

#[tauri::command]
pub async fn glue_start_trigger(profile: String, trigger_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.start_trigger().name(&trigger_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Trigger {} activated", trigger_name))
}

#[tauri::command]
pub async fn glue_stop_trigger(profile: String, trigger_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.stop_trigger().name(&trigger_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Trigger {} deactivated", trigger_name))
}
