use super::load_config;
use aws_sdk_organizations::Client;
use serde::Serialize;

pub async fn create_organizations_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct OrgInfo {
    pub id: String,
    pub arn: String,
    pub master_account_id: String,
}

#[tauri::command]
pub async fn org_describe(profile: String) -> Result<OrgInfo, String> {
    let client = create_organizations_client(&profile).await;
    let resp = client.describe_organization().send().await.map_err(|e| e.to_string())?;
    let org = resp.organization().ok_or("No organization found")?;
    Ok(OrgInfo {
        id: org.id().unwrap_or_default().to_string(),
        arn: org.arn().unwrap_or_default().to_string(),
        master_account_id: org.master_account_id().unwrap_or_default().to_string(),
    })
}

#[derive(Serialize)]
pub struct OrgAccount {
    pub id: String,
    pub name: String,
    pub email: String,
    pub status: String,
}

#[tauri::command]
pub async fn org_list_accounts(profile: String) -> Result<Vec<OrgAccount>, String> {
    let client = create_organizations_client(&profile).await;
    let resp = client.list_accounts().send().await.map_err(|e| e.to_string())?;
    Ok(resp.accounts().iter().map(|a| OrgAccount {
        id: a.id().unwrap_or_default().to_string(),
        name: a.name().unwrap_or_default().to_string(),
        email: a.email().unwrap_or_default().to_string(),
        status: a.status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}

#[derive(Serialize)]
pub struct OrgUnit {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn org_list_roots(profile: String) -> Result<Vec<OrgUnit>, String> {
    let client = create_organizations_client(&profile).await;
    let resp = client.list_roots().send().await.map_err(|e| e.to_string())?;
    Ok(resp.roots().iter().map(|r| OrgUnit {
        id: r.id().unwrap_or_default().to_string(),
        name: r.name().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn org_list_ous(profile: String, parent_id: String) -> Result<Vec<OrgUnit>, String> {
    let client = create_organizations_client(&profile).await;
    let resp = client.list_organizational_units_for_parent().parent_id(&parent_id).send().await.map_err(|e| e.to_string())?;
    Ok(resp.organizational_units().iter().map(|o| OrgUnit {
        id: o.id().unwrap_or_default().to_string(),
        name: o.name().unwrap_or_default().to_string(),
    }).collect())
}
