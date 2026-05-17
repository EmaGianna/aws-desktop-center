use super::load_config;
use aws_sdk_lakeformation::Client;
use serde::Serialize;

#[derive(Serialize)]
pub struct LfDatabase {
    pub name: String,
    pub catalog_id: String,
}

#[derive(Serialize)]
pub struct LfTable {
    pub database: String,
    pub name: String,
    pub catalog_id: String,
}

#[derive(Serialize)]
pub struct LfPermission {
    pub principal: String,
    pub resource: String,
    pub permissions: Vec<String>,
    pub permissions_with_grant: Vec<String>,
}

#[derive(Serialize)]
pub struct LfDataLakeSettings {
    pub admins: Vec<String>,
    pub create_database_default_permissions: Vec<String>,
    pub create_table_default_permissions: Vec<String>,
}

#[derive(Serialize)]
pub struct LfResource {
    pub resource_arn: String,
    pub role_arn: String,
}

#[derive(Serialize)]
pub struct LfTag {
    pub tag_key: String,
    pub tag_values: Vec<String>,
    pub catalog_id: String,
}

#[derive(Serialize)]
pub struct LfTagPermission {
    pub tag_key: String,
    pub tag_values: Vec<String>,
    pub principal: String,
    pub permissions: Vec<String>,
}

#[tauri::command]
pub async fn lf_list_databases(profile: String) -> Result<Vec<LfDatabase>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let _resp = client.list_resources().send().await.map_err(|e| e.to_string())?;
    // Use Glue to list databases since LF manages permissions on Glue catalog
    let glue_client = aws_sdk_glue::Client::new(&config);
    let glue_resp = glue_client.get_databases().send().await.map_err(|e| e.to_string())?;
    Ok(glue_resp.database_list().iter().map(|db| LfDatabase {
        name: db.name().to_string(),
        catalog_id: db.catalog_id().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn lf_list_tables(profile: String, database_name: String) -> Result<Vec<LfTable>, String> {
    let config = load_config(&profile).await;
    let glue_client = aws_sdk_glue::Client::new(&config);
    let resp = glue_client.get_tables().database_name(&database_name).send().await.map_err(|e| e.to_string())?;
    Ok(resp.table_list().iter().map(|t| LfTable {
        database: database_name.clone(),
        name: t.name().to_string(),
        catalog_id: t.catalog_id().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn lf_list_permissions(profile: String) -> Result<Vec<LfPermission>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let mut all_perms = Vec::new();
    let mut token: Option<String> = None;

    loop {
        let mut req = client.list_permissions().max_results(100);
        if let Some(t) = &token {
            req = req.next_token(t);
        }
        let resp = req.send().await.map_err(|e| e.to_string())?;
        for p in resp.principal_resource_permissions() {
            let principal = p.principal()
                .and_then(|pr| pr.data_lake_principal_identifier())
                .unwrap_or_default().to_string();
            let resource = format!("{:?}", p.resource());
            let permissions: Vec<String> = p.permissions().iter().map(|perm| format!("{:?}", perm)).collect();
            let permissions_with_grant: Vec<String> = p.permissions_with_grant_option().iter().map(|perm| format!("{:?}", perm)).collect();
            all_perms.push(LfPermission { principal, resource, permissions, permissions_with_grant });
        }
        token = resp.next_token().map(|s| s.to_string());
        if token.is_none() { break; }
    }
    Ok(all_perms)
}

#[tauri::command]
pub async fn lf_get_settings(profile: String) -> Result<LfDataLakeSettings, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.get_data_lake_settings().send().await.map_err(|e| e.to_string())?;
    let settings = resp.data_lake_settings().ok_or("No settings")?;
    let admins: Vec<String> = settings.data_lake_admins().iter()
        .map(|a| a.data_lake_principal_identifier().unwrap_or_default().to_string())
        .collect();
    let create_db_perms: Vec<String> = settings.create_database_default_permissions().iter()
        .map(|p| format!("{:?}", p.permissions()))
        .collect();
    let create_tbl_perms: Vec<String> = settings.create_table_default_permissions().iter()
        .map(|p| format!("{:?}", p.permissions()))
        .collect();
    Ok(LfDataLakeSettings {
        admins,
        create_database_default_permissions: create_db_perms,
        create_table_default_permissions: create_tbl_perms,
    })
}

#[tauri::command]
pub async fn lf_list_resources(profile: String) -> Result<Vec<LfResource>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_resources().send().await.map_err(|e| e.to_string())?;
    Ok(resp.resource_info_list().iter().map(|r| LfResource {
        resource_arn: r.resource_arn().unwrap_or_default().to_string(),
        role_arn: r.role_arn().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn lf_list_tags(profile: String) -> Result<Vec<LfTag>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_lf_tags().send().await.map_err(|e| e.to_string())?;
    Ok(resp.lf_tags().iter().map(|t| LfTag {
        tag_key: t.tag_key().to_string(),
        tag_values: t.tag_values().iter().map(|v| v.to_string()).collect(),
        catalog_id: t.catalog_id().unwrap_or_default().to_string(),
    }).collect())
}

#[tauri::command]
pub async fn lf_list_tag_permissions(profile: String) -> Result<Vec<LfTagPermission>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    let resp = client.list_permissions()
        .resource(
            aws_sdk_lakeformation::types::Resource::builder()
                .lf_tag_policy(
                    aws_sdk_lakeformation::types::LfTagPolicyResource::builder()
                        .resource_type(aws_sdk_lakeformation::types::ResourceType::Database)
                        .build()
                        .unwrap()
                )
                .build()
        )
        .send().await;

    // If tag-based permissions fail, return empty (not all accounts use LF-Tags)
    match resp {
        Ok(r) => {
            Ok(r.principal_resource_permissions().iter().map(|p| {
                let principal = p.principal()
                    .and_then(|pr| pr.data_lake_principal_identifier())
                    .unwrap_or_default().to_string();
                let permissions: Vec<String> = p.permissions().iter().map(|perm| format!("{:?}", perm)).collect();
                LfTagPermission {
                    tag_key: String::new(),
                    tag_values: Vec::new(),
                    principal,
                    permissions,
                }
            }).collect())
        }
        Err(_) => Ok(Vec::new())
    }
}
