use super::load_config;
use aws_sdk_account::Client;
use serde::Serialize;

pub async fn create_account_client(profile: &str) -> Client {
    let config = load_config(profile).await;
    Client::new(&config)
}

#[derive(Serialize)]
pub struct ContactInfo {
    pub full_name: String,
    pub company_name: String,
    pub address_line1: String,
    pub city: String,
    pub country_code: String,
}

#[tauri::command]
pub async fn account_get_contact_info(profile: String) -> Result<ContactInfo, String> {
    let client = create_account_client(&profile).await;
    let resp = client.get_contact_information().send().await.map_err(|e| e.to_string())?;
    let info = resp.contact_information().ok_or("No contact information found")?;
    Ok(ContactInfo {
        full_name: info.full_name().to_string(),
        company_name: info.company_name().unwrap_or_default().to_string(),
        address_line1: info.address_line1().to_string(),
        city: info.city().to_string(),
        country_code: info.country_code().to_string(),
    })
}

#[derive(Serialize)]
pub struct RegionInfo {
    pub name: String,
    pub status: String,
}

#[tauri::command]
pub async fn account_list_regions(profile: String) -> Result<Vec<RegionInfo>, String> {
    let client = create_account_client(&profile).await;
    let resp = client.list_regions().send().await.map_err(|e| e.to_string())?;
    Ok(resp.regions().iter().map(|r| RegionInfo {
        name: r.region_name().unwrap_or_default().to_string(),
        status: r.region_opt_status().map(|s| s.as_str().to_string()).unwrap_or_default(),
    }).collect())
}
