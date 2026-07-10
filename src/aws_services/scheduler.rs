use super::load_config;
use aws_sdk_scheduler::Client;
use serde::Serialize;

pub async fn create_scheduler_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Schedule {
    pub name: String,
    pub group_name: String,
    pub state: String,
    pub creation_date: String,
}

#[tauri::command]
pub async fn scheduler_list_schedules(profile: String) -> Result<Vec<Schedule>, String> {
    let client = create_scheduler_client(&profile).await;
    let resp = client.list_schedules().send().await.map_err(|e| e.to_string())?;
    Ok(resp.schedules().iter().map(|s| Schedule {
        name: s.name().unwrap_or_default().to_string(),
        group_name: s.group_name().unwrap_or_default().to_string(),
        state: s.state().map(|st| st.as_str().to_string()).unwrap_or_default(),
        creation_date: s.creation_date().map(|d| d.to_string()).unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn scheduler_create_schedule(profile: String, name: String, schedule_expression: String, target_arn: String, role_arn: String) -> Result<String, String> {
    let client = create_scheduler_client(&profile).await;
    let flex = aws_sdk_scheduler::types::FlexibleTimeWindow::builder()
        .mode(aws_sdk_scheduler::types::FlexibleTimeWindowMode::Off)
        .build().map_err(|e| e.to_string())?;
    let target = aws_sdk_scheduler::types::Target::builder()
        .arn(&target_arn)
        .role_arn(&role_arn)
        .build().map_err(|e| e.to_string())?;
    client.create_schedule()
        .name(&name)
        .schedule_expression(&schedule_expression)
        .flexible_time_window(flex)
        .target(target)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Schedule {} created", name))
}

#[tauri::command]
pub async fn scheduler_delete_schedule(profile: String, name: String) -> Result<String, String> {
    let client = create_scheduler_client(&profile).await;
    client.delete_schedule().name(&name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Schedule {} deleted", name))
}
