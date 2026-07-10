use super::load_config;
use aws_sdk_iam::Client;
use serde::Serialize;

pub async fn create_iam_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct IamUser {
    pub name: String,
    pub arn: String,
    pub path: String,
    pub create_date: String,
}

#[tauri::command]
pub async fn iam_list_users(profile: String) -> Result<Vec<IamUser>, String> {
    let client = create_iam_client(&profile).await;
    let resp = client.list_users().send().await.map_err(|e| e.to_string())?;
    Ok(resp.users().iter().map(|u| IamUser {
        name: u.user_name().to_string(),
        arn: u.arn().to_string(),
        path: u.path().to_string(),
        create_date: u.create_date().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn iam_create_user(profile: String, user_name: String) -> Result<String, String> {
    let client = create_iam_client(&profile).await;
    client.create_user().user_name(&user_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User {} created", user_name))
}

#[tauri::command]
pub async fn iam_delete_user(profile: String, user_name: String) -> Result<String, String> {
    let client = create_iam_client(&profile).await;
    client.delete_user().user_name(&user_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("User {} deleted", user_name))
}

#[derive(Serialize)]
pub struct IamRole {
    pub name: String,
    pub arn: String,
    pub path: String,
    pub create_date: String,
}

#[tauri::command]
pub async fn iam_list_roles(profile: String) -> Result<Vec<IamRole>, String> {
    let client = create_iam_client(&profile).await;
    let resp = client.list_roles().send().await.map_err(|e| e.to_string())?;
    Ok(resp.roles().iter().map(|r| IamRole {
        name: r.role_name().to_string(),
        arn: r.arn().to_string(),
        path: r.path().to_string(),
        create_date: r.create_date().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn iam_create_role(profile: String, role_name: String, assume_role_policy_document: String) -> Result<String, String> {
    let client = create_iam_client(&profile).await;
    client.create_role().role_name(&role_name).assume_role_policy_document(&assume_role_policy_document).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Role {} created", role_name))
}

#[tauri::command]
pub async fn iam_delete_role(profile: String, role_name: String) -> Result<String, String> {
    let client = create_iam_client(&profile).await;
    client.delete_role().role_name(&role_name).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Role {} deleted", role_name))
}

#[derive(Serialize)]
pub struct IamGroup {
    pub name: String,
    pub arn: String,
    pub create_date: String,
}

#[tauri::command]
pub async fn iam_list_groups(profile: String) -> Result<Vec<IamGroup>, String> {
    let client = create_iam_client(&profile).await;
    let resp = client.list_groups().send().await.map_err(|e| e.to_string())?;
    Ok(resp.groups().iter().map(|g| IamGroup {
        name: g.group_name().to_string(),
        arn: g.arn().to_string(),
        create_date: g.create_date().to_string(),
    }).collect())
}

#[derive(Serialize)]
pub struct IamPolicy {
    pub name: String,
    pub arn: String,
    pub attachment_count: i32,
}

#[tauri::command]
pub async fn iam_list_policies(profile: String) -> Result<Vec<IamPolicy>, String> {
    let client = create_iam_client(&profile).await;
    let resp = client.list_policies().scope(aws_sdk_iam::types::PolicyScopeType::Local).send().await.map_err(|e| e.to_string())?;
    Ok(resp.policies().iter().map(|p| IamPolicy {
        name: p.policy_name().unwrap_or_default().to_string(),
        arn: p.arn().unwrap_or_default().to_string(),
        attachment_count: p.attachment_count().unwrap_or(0),
    }).collect())
}

#[derive(Serialize)]
pub struct AttachedPolicy {
    pub name: String,
    pub arn: String,
}

#[tauri::command]
pub async fn iam_list_attached_user_policies(profile: String, user_name: String) -> Result<Vec<AttachedPolicy>, String> {
    let client = create_iam_client(&profile).await;
    let resp = client.list_attached_user_policies().user_name(&user_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.attached_policies().iter().map(|p| AttachedPolicy {
        name: p.policy_name().unwrap_or_default().to_string(),
        arn: p.policy_arn().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn iam_list_attached_role_policies(profile: String, role_name: String) -> Result<Vec<AttachedPolicy>, String> {
    let client = create_iam_client(&profile).await;
    let resp = client.list_attached_role_policies().role_name(&role_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.attached_policies().iter().map(|p| AttachedPolicy {
        name: p.policy_name().unwrap_or_default().to_string(),
        arn: p.policy_arn().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn iam_attach_user_policy(profile: String, user_name: String, policy_arn: String) -> Result<String, String> {
    let client = create_iam_client(&profile).await;
    client.attach_user_policy().user_name(&user_name).policy_arn(&policy_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Policy attached to {}", user_name))
}

#[tauri::command]
pub async fn iam_detach_user_policy(profile: String, user_name: String, policy_arn: String) -> Result<String, String> {
    let client = create_iam_client(&profile).await;
    client.detach_user_policy().user_name(&user_name).policy_arn(&policy_arn).send().await.map_err(|e| e.to_string())?;
    Ok(format!("Policy detached from {}", user_name))
}
