pub mod athena;
pub mod cloudwatch;
pub mod dynamodb;
pub mod eventbridge;
pub mod glue;
pub mod lakeformation;
pub mod lambda;
pub mod profiles;
pub mod rds;
pub mod redshift;
pub mod s3;

use aws_config::{BehaviorVersion, Region};
use aws_config::defaults;
use std::fs;

/// Reads endpoint_url from ~/.aws/config for the given profile.
/// Returns None if not found (means use real AWS endpoints).
pub fn get_endpoint_url(profile: &str) -> Option<String> {
    let home = dirs::home_dir()?;
    let config_path = home.join(".aws").join("config");
    let content = fs::read_to_string(config_path).ok()?;

    let section_name = if profile == "default" {
        "[default]".to_string()
    } else {
        format!("[profile {}]", profile)
    };

    let mut in_section = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            in_section = trimmed == section_name;
            continue;
        }
        if in_section {
            if let Some(value) = trimmed.strip_prefix("endpoint_url") {
                let value = value.trim_start_matches(|c| c == ' ' || c == '=').trim();
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
        }
    }
    None
}

/// Returns true if the profile uses a custom endpoint (emulator).
pub fn is_emulated(profile: &str) -> bool {
    get_endpoint_url(profile).is_some()
}

pub async fn load_config(profile: &str) -> aws_config::SdkConfig {
    let mut builder = defaults(BehaviorVersion::latest())
        .profile_name(profile)
        .region(Region::new("us-east-1"));

    if let Some(endpoint) = get_endpoint_url(profile) {
        builder = builder.endpoint_url(&endpoint);
    }

    builder.load().await
}
