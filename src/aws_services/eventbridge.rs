use super::load_config;
use aws_sdk_eventbridge::Client;
use serde::Serialize;

#[derive(Serialize)]
pub struct EventBus {
    pub name: String,
    pub arn: String,
}

#[derive(Serialize)]
pub struct EventRule {
    pub name: String,
    pub state: String,
    pub schedule: String,
    pub description: String,
    pub event_pattern: String,
    pub event_bus_name: String,
}

#[derive(Serialize)]
pub struct RuleTarget {
    pub id: String,
    pub arn: String,
    pub input: String,
}

#[tauri::command]
pub async fn eb_list_buses(profile: String) -> Result<Vec<EventBus>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_event_buses().send().await.map_err(|e| e.to_string())?;
    Ok(resp.event_buses().iter().map(|b| EventBus {
        name: b.name().unwrap_or_default().to_string(),
        arn: b.arn().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn eb_list_rules(profile: String, bus_name: String) -> Result<Vec<EventRule>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let mut all_rules = Vec::new();
    let mut token: Option<String> = None;

    loop {
        let mut req = client.list_rules().event_bus_name(&bus_name);
        if let Some(t) = &token {
            req = req.next_token(t);
        }
        let resp = req.send().await.map_err(|e| e.to_string())?;
        for r in resp.rules() {
            all_rules.push(EventRule {
                name: r.name().unwrap_or_default().to_string(),
                state: r.state().map(|s| format!("{:?}", s)).unwrap_or_default(),
                schedule: r.schedule_expression().unwrap_or_default().to_string(),
                description: r.description().unwrap_or_default().to_string(),
                event_pattern: r.event_pattern().unwrap_or_default().to_string(),
                event_bus_name: bus_name.clone(),
            });
        }
        token = resp.next_token().map(|s| s.to_string());
        if token.is_none() { break; }
    }
    Ok(all_rules)
}

#[tauri::command]
pub async fn eb_list_targets(profile: String, rule_name: String, bus_name: String) -> Result<Vec<RuleTarget>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_targets_by_rule()
        .rule(&rule_name)
        .event_bus_name(&bus_name)
        .send().await.map_err(|e| e.to_string())?;
    Ok(resp.targets().iter().map(|t| RuleTarget {
        id: t.id().to_string(),
        arn: t.arn().to_string(),
        input: t.input().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn eb_enable_rule(profile: String, rule_name: String, bus_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.enable_rule().name(&rule_name).event_bus_name(&bus_name)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Rule {} enabled", rule_name))
}

#[tauri::command]
pub async fn eb_disable_rule(profile: String, rule_name: String, bus_name: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    client.disable_rule().name(&rule_name).event_bus_name(&bus_name)
        .send().await.map_err(|e| e.to_string())?;
    Ok(format!("Rule {} disabled", rule_name))
}

#[tauri::command]
pub async fn eb_put_event(profile: String, bus_name: String, source: String, detail_type: String, detail: String) -> Result<String, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let entry = aws_sdk_eventbridge::types::PutEventsRequestEntry::builder()
        .event_bus_name(&bus_name)
        .source(&source)
        .detail_type(&detail_type)
        .detail(&detail)
        .build();
    let resp = client.put_events().entries(entry)
        .send().await.map_err(|e| e.to_string())?;
    let failed = resp.failed_entry_count();
    if failed > 0 {
        Err(format!("{} entries failed", failed))
    } else {
        Ok("Event sent successfully".to_string())
    }
}
