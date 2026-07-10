use super::load_config;
use aws_sdk_mq::Client;
use serde::Serialize;

pub async fn create_mq_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct Broker {
    pub id: String,
    pub name: String,
    pub state: String,
    pub engine_type: String,
    pub instance_type: String,
}

#[tauri::command]
pub async fn mq_list_brokers(profile: String) -> Result<Vec<Broker>, String> {
    let client = create_mq_client(&profile).await;
    let resp = client.list_brokers().send().await.map_err(|e| e.to_string())?;
    Ok(resp.broker_summaries().iter().map(|b| Broker {
        id: b.broker_id().unwrap_or_default().to_string(),
        name: b.broker_name().unwrap_or_default().to_string(),
        state: b.broker_state().map(|s| s.as_str().to_string()).unwrap_or_default(),
        engine_type: b.engine_type().map(|e| e.as_str().to_string()).unwrap_or_default(),
        instance_type: b.host_instance_type().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn mq_reboot_broker(profile: String, broker_id: String) -> Result<String, String> {
    let client = create_mq_client(&profile).await;
    client.reboot_broker().broker_id(&broker_id).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Rebooting broker {}", broker_id))
}
