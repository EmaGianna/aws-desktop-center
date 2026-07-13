pub mod account;
pub mod acm;
pub mod apigateway;
pub mod apigatewayv2;
pub mod appconfig;
pub mod appsync;
pub mod athena;
pub mod autoscaling;
pub mod awsconfig;
pub mod backup;
pub mod batch;
pub mod cloudformation;
pub mod cloudfront;
pub mod cloudfrontkvs;
pub mod cloudtrail;
pub mod cloudwatch;
pub mod codebuild;
pub mod codedeploy;
pub mod codepipeline;
pub mod cognito;
pub mod costandusagereport;
pub mod costexplorer;
pub mod docdb;
pub mod dynamodb;
pub mod dynamodbstreams;
pub mod ebs;
pub mod ec2;
pub mod ecr;
pub mod ecs;
pub mod efs;
pub mod eks;
pub mod elasticache;
pub mod elasticbeanstalk;
pub mod elbv2;
pub mod emr;
pub mod eventbridge;
pub mod firehose;
pub mod glue;
pub mod iam;
pub mod inspector2;
pub mod iot;
pub mod kafka;
pub mod kinesis;
pub mod kms;
pub mod lakeformation;
pub mod lambda;
pub mod memorydb;
pub mod mq;
pub mod neptune;
pub mod opensearch;
pub mod organizations;
pub mod pipes;
pub mod pricing;
pub mod profiles;
pub mod rds;
pub mod rdsdata;
pub mod redshift;
pub mod resourcegroupstagging;
pub mod route53;
pub mod s3;
pub mod s3files;
pub mod s3tables;
pub mod s3vectors;
pub mod scheduler;
pub mod secretsmanager;
pub mod servicediscovery;
pub mod sesv2;
pub mod sns;
pub mod sqs;
pub mod ssm;
pub mod stepfunctions;
pub mod sts;
pub mod transfer;
pub mod waf;

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

/// Reads the `region` key from ~/.aws/config for the given profile.
/// Returns None if not found (caller should fall back to a default and warn the user).
pub fn get_region(profile: &str) -> Option<String> {
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
            if let Some(value) = trimmed.strip_prefix("region") {
                let value = value.trim_start_matches(|c| c == ' ' || c == '=').trim();
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
        }
    }
    None
}

pub const DEFAULT_REGION: &str = "us-east-1";

pub async fn load_config(profile: &str) -> aws_config::SdkConfig {
    let region = get_region(profile).unwrap_or_else(|| DEFAULT_REGION.to_string());
    let mut builder = defaults(BehaviorVersion::latest())
        .profile_name(profile)
        .region(Region::new(region));

    if let Some(endpoint) = get_endpoint_url(profile) {
        builder = builder.endpoint_url(&endpoint);
    }

    builder.load().await
}
