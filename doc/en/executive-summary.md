# Executive Summary

## AWS Desktop Center

AWS Desktop Center is an open-source desktop application for exploring and operating AWS resources from one graphical interface. It combines a native Rust backend, the official AWS SDK for Rust, and a lightweight HTML/CSS/JavaScript frontend packaged with Tauri 2.

The current project is no longer limited to AWS data services. It exposes **73 service modules organized into 10 domains**: Storage, Database, Analytics, Compute, Networking, Security, Monitoring, Messaging, Governance, and Cost.

## The problem it addresses

Daily AWS work is usually split between the web console, CLI commands, scripts, and service-specific tools. That creates friction when an operator needs to inspect several services, follow a resource relationship, or perform a small operational action. The AWS web console is comprehensive, but it is browser-based and its navigation and workflows vary by service.

AWS Desktop Center provides a focused alternative for common inspection and management tasks:

- one desktop entry point for multiple AWS accounts and local emulators;
- consistent navigation across service families;
- fast access to inventories, details, logs, query results, and operational controls;
- no Node.js runtime or frontend build chain;
- local use of the standard AWS credential and configuration files.

It is a complementary operations tool, not a complete replacement for the AWS Console, infrastructure-as-code, or the AWS CLI. Each module intentionally implements a useful subset of its service API.

## Product experience

At startup, the application discovers profiles in `~/.aws/credentials` and `~/.aws/config`. The user selects a profile and enters a dark, media-center-style workspace. A searchable sidebar and a tile dashboard group services by domain. Categories can be collapsed, the selected profile remains visible, and profiles configured with a custom endpoint show an **EMULATED** badge.

The application supports read-only exploration as well as selected write and lifecycle actions. Examples include uploading and moving S3 objects, starting and stopping compute resources, running Athena or Redshift queries, invoking Lambda functions, managing queues and topics, working with IAM identities, updating tags, and inspecting costs. Destructive actions exposed by a module use confirmation dialogs in the interface.

## Scope by domain

| Domain | Included modules |
|---|---|
| Storage | S3, EBS, EFS, AWS Backup, S3 Tables, S3 Vectors, S3 Files, Transfer Family |
| Database | DynamoDB, RDS, Redshift, ElastiCache, MemoryDB, DocumentDB, Neptune, OpenSearch, RDS Data API |
| Analytics | Glue, Athena, Kinesis, Data Firehose, EMR, MSK (Kafka) |
| Compute | Lambda, EC2, ECS, ECR, EKS, AWS Batch, CodeBuild, Elastic Beanstalk, CodeDeploy, CodePipeline |
| Networking | VPC, API Gateway REST, API Gateway v2, Route 53, CloudFront, CloudFront KeyValueStore, Elastic Load Balancing v2, AppSync, Cloud Map |
| Security | IAM, STS, Secrets Manager, SSM Parameter Store, KMS, Cognito, ACM, WAF v2, Inspector |
| Monitoring | CloudWatch |
| Messaging | EventBridge, SQS, SNS, Step Functions, EventBridge Scheduler, EventBridge Pipes, Amazon MQ, SES, IoT Core |
| Governance | Lake Formation, CloudFormation, Auto Scaling, AppConfig, Resource Groups Tagging, AWS Config, CloudTrail, Organizations, Account |
| Cost | Cost Explorer, Pricing, Cost & Usage Reports |

The exact operations available in every module are documented in the [Functional Documentation](functional-documentation.md).

## Target users

- cloud engineers and AWS administrators who need a fast visual inventory;
- developers who want to inspect or operate resources without composing CLI commands;
- DevOps, platform, data, security, and FinOps teams working across service domains;
- learners who benefit from seeing AWS resources grouped in a consistent interface;
- teams using AWS-compatible local emulators through a profile-level endpoint.

## Architecture and technology

- **Desktop runtime:** Tauri 2 and the operating system's native webview.
- **Backend:** Rust 2021 with asynchronous AWS SDK clients.
- **Frontend:** native ES modules, HTML, and CSS; no framework and no compilation step.
- **Communication:** typed Tauri commands invoked from JavaScript over local IPC.
- **Authentication:** the standard AWS SDK credential chain selected by profile.
- **Distribution:** source builds, Linux AppImage packaging, and precompiled Linux and Windows executables in `bin/`.

The frontend never receives AWS credentials. Requests are performed by the local Rust process, and AWS authorization remains governed by the IAM permissions of the selected profile. See the [Technical Documentation](technical-documentation.md) for architecture and build details.

## Current constraints

- The backend reads the active region from the selected profile's section in `~/.aws/config` and displays it in the sidebar. If the profile has no `region` key, the application falls back to **`us-east-1`** and shows a configuration warning. Region changes are made in the AWS profile rather than through an in-app selector.
- Service coverage is intentionally partial. A visible module does not expose every API offered by AWS.
- A profile with `endpoint_url` in `~/.aws/config` sends supported SDK clients to that custom endpoint. Emulator coverage depends on the emulator; the UI explicitly flags Redshift and Lake Formation as unsupported in emulator mode.
- There is currently no automated test suite or CI workflow in the repository.
- Actions execute with the selected profile's permissions and can affect real resources and charges.

## Value and direction

AWS Desktop Center reduces context switching and provides a compact, inspectable, cross-platform codebase. Its modular backend and frontend make additional service operations straightforward to add without adopting a large web framework.

The project's direction is to grow as a broad AWS desktop operations center while preserving three qualities: a small local footprint, transparent use of standard AWS credentials, and focused workflows rather than attempting to reproduce every screen of the AWS Console.

## Project status

The repository identifies the application as **AWS Desktop Center**, package and binary name `aws-desktop-center`, version `0.1.0`, and MIT-licensed software. It should be considered an early-stage operational tool: useful today, but requiring permission-aware testing in each target account and emulator before production use.
