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

pub async fn load_config(profile: &str) -> aws_config::SdkConfig {
    defaults(BehaviorVersion::latest())
        .profile_name(profile)
        .region(Region::new("us-east-1"))
        .load()
        .await
}
