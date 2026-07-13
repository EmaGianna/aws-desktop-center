# Functional Documentation

## AWS Desktop Center — User Guide

This guide describes the behavior implemented by the current application. AWS Desktop Center provides selected workflows for 73 AWS modules; it does not expose every API of every service.

## 1. Before you start

You need an AWS profile in one or both standard files:

- `~/.aws/credentials`
- `~/.aws/config`

The profile may use long-lived keys, temporary credentials, SSO, an assumed role, or another provider supported by the AWS SDK credential chain. The profile must have IAM permission for every operation you intend to use. The application does not create credentials or grant permissions.

The current release reads the SDK region from the selected profile's section in `~/.aws/config`. The active region is shown in the sidebar. If the profile does not define `region`, the application uses **`us-east-1`** as a fallback and displays a warning with the configuration to add. Confirm that the resources you expect to see are in the displayed region. Some global services and operations with an explicit region field are exceptions.

## 2. Starting and navigating the application

1. Launch `aws-desktop-center`.
2. Select a discovered AWS profile. Profiles are read from section names in both AWS files and duplicates are removed.
3. Use the tile dashboard or the categorized sidebar to open a service.
4. Filter the sidebar with **Search services...**. Click a category header to collapse or expand it.
5. Check the profile, active region, and optional emulator endpoint badges in the sidebar before performing an operation.
6. Use **Switch Profile** to return to profile selection. The application keeps only the selected profile, its region/endpoint metadata, and the active service in UI memory.

Opening a module normally loads its first inventory immediately. Detail views and tabs make additional API calls. A loading indicator is shown while a request is pending; an empty state is shown when no resources are returned.

## 3. Profiles, regions, and emulated endpoints

The application reads `region` directly from the selected section in `~/.aws/config`:

```ini
[default]
region = us-west-2

[profile production]
region = eu-west-1
```

Use `[default]` for the default profile and `[profile name]` for a named profile. The selected value configures the shared AWS SDK clients and is shown next to the profile in the sidebar. If the key is absent or empty, `us-east-1` is used and a warning panel shows the exact section to add. After editing the file, switch profiles or restart the application so that profile metadata and service views are reloaded. There is no in-app region editor or simultaneous multi-region view.

A profile can redirect AWS SDK calls to an AWS-compatible endpoint by adding `endpoint_url` to its section in `~/.aws/config`:

```ini
[profile local]
region = us-east-1
endpoint_url = http://localhost:4566
```

When selected, the sidebar displays `EMULATED: <endpoint>`. S3 automatically uses path-style bucket addressing in this mode. Emulator implementations differ, so an operation visible in the UI may still be absent from the active emulator. Redshift and Lake Formation are explicitly marked with warning badges because the emulators targeted by the project do not support them.

## 4. Service catalog and available operations

### 4.1 Storage

| Module | Available workflows |
|---|---|
| **S3** | List buckets and browse objects/prefixes; inspect object metadata; search by prefix; upload and download objects; delete, copy, and move objects; generate presigned download URLs. In emulator mode, path-style addressing is forced. |
| **EBS** | List volumes and snapshots; create/delete volumes; attach/detach volumes; create/delete snapshots. |
| **EFS** | List, create, and delete file systems; list, create, and delete mount targets. |
| **AWS Backup** | List backup vaults and plans; browse recovery points; start a backup job. |
| **S3 Tables** | List/create/delete table buckets; list namespaces and tables. |
| **S3 Vectors** | List/create/delete vector buckets; list vector indexes. |
| **S3 Files** | List/create/delete file systems; list/create/delete mount targets. Availability depends on the corresponding AWS API and account access. |
| **Transfer Family** | List servers; start, stop, or delete a server; list users and delete users. |

### 4.2 Database

| Module | Available workflows |
|---|---|
| **DynamoDB** | List tables; view table schema, keys, indexes, status, and capacity information; scan items; query by partition key. |
| **RDS** | List DB instances, clusters, and snapshots; inspect engines, status, endpoints, and configuration; start or stop DB instances. |
| **Redshift** | List clusters and snapshots; list database tables through the Redshift Data API; submit SQL, poll its status, and view returned rows. Marked unsupported for emulated profiles. |
| **ElastiCache** | List cache clusters; create and delete clusters. |
| **MemoryDB** | List, create, and delete clusters. |
| **DocumentDB** | List clusters; start and stop clusters. |
| **Neptune** | List clusters and DB instances. |
| **OpenSearch** | List domains; create and delete domains. |
| **RDS Data API** | Execute a SQL statement against a supplied resource ARN, secret ARN, database, and optional transaction context. |

### 4.3 Analytics

| Module | Available workflows |
|---|---|
| **Glue** | Browse Data Catalog databases and tables; list jobs, inspect job runs and source scripts, and start jobs with arguments; list/start crawlers; list/start/stop triggers. |
| **Athena** | List catalog databases and saved queries; inspect execution history; compose and start SQL with database and S3 output settings; poll status; display results; download results or generate a link to the result object. |
| **Kinesis** | List, create, and delete streams; put a record; retrieve records from a shard. |
| **Data Firehose** | List delivery streams; put a record; delete a delivery stream. |
| **EMR** | List clusters and their steps; terminate a cluster. |
| **MSK (Kafka)** | List clusters and broker nodes; delete a cluster. |

### 4.4 Compute and delivery

| Module | Available workflows |
|---|---|
| **Lambda** | List functions and configuration; inspect environment variables; invoke with a JSON payload; read recent CloudWatch logs; obtain function code metadata and download/extract a deployment package. |
| **EC2** | List instances; start, stop, reboot, or terminate an instance. Termination is destructive. |
| **ECS** | List clusters, services, and tasks; stop a task; update a service's desired task count. |
| **ECR** | List repositories and images; create or delete a repository. |
| **EKS** | List clusters and node groups. |
| **AWS Batch** | List compute environments, job queues, and jobs; submit, cancel, or terminate jobs. |
| **CodeBuild** | List projects and builds; start or stop a build. |
| **Elastic Beanstalk** | List applications and environments; restart an environment's application servers. |
| **CodeDeploy** | List applications, deployment groups, and deployments; stop a deployment. |
| **CodePipeline** | List pipelines; inspect pipeline state; start an execution; delete a pipeline. |

### 4.5 Networking and APIs

| Module | Available workflows |
|---|---|
| **VPC** | List VPCs, subnets, security groups, and route tables. These views use EC2 APIs. |
| **API Gateway (REST)** | List REST APIs; browse resources and stages; delete an API. |
| **API Gateway v2** | List HTTP/WebSocket APIs; browse routes and stages; delete an API. |
| **Route 53** | List, create, and delete hosted zones; list records; create or update a record with an UPSERT change. |
| **CloudFront** | List distributions; create a cache invalidation for paths. |
| **CloudFront KeyValueStore** | List and create key-value stores. |
| **Load Balancers** | List ALB/NLB load balancers and target groups; inspect target health; delete a load balancer. |
| **AppSync** | List GraphQL APIs and data sources; delete an API. |
| **Cloud Map** | List namespaces, services, and service instances; delete a service. |

### 4.6 Security and identity

| Module | Available workflows |
|---|---|
| **IAM** | List/create/delete users and roles; list groups and policies; inspect policies attached to users and roles; attach/detach a managed policy from a user. |
| **STS** | Display caller identity; request temporary credentials with AssumeRole or GetSessionToken. Returned temporary credentials are displayed for the current workflow; selecting a profile remains the application's authentication mechanism. |
| **Secrets Manager** | List secrets; retrieve a secret value on demand; create, update, or schedule deletion of a secret. Secret values are sensitive and become visible in the UI when requested. |
| **SSM Parameter Store** | List parameters; retrieve a parameter, optionally decrypted; create/update and delete parameters. |
| **KMS** | List keys; create a key; enable/disable a key; schedule key deletion. |
| **Cognito** | List/create/delete user pools; list, enable, disable, or delete users in a pool. |
| **ACM** | List certificates; request a certificate; delete a certificate. Domain validation still takes place through AWS. |
| **WAF v2** | List web ACLs and IP sets; create/delete IP sets. Scope selection matters: regional and CloudFront resources are distinct. |
| **Inspector** | List findings; enable or disable Inspector scanning resource types for the account. |

### 4.7 Monitoring

| Module | Available workflows |
|---|---|
| **CloudWatch** | List alarms and metrics; browse log groups and streams; read log events; filter/search logs. The module combines CloudWatch and CloudWatch Logs APIs. |

### 4.8 Messaging and integration

| Module | Available workflows |
|---|---|
| **EventBridge** | List event buses, rules, and rule targets; enable/disable rules; submit a custom event. |
| **SQS** | List/create/delete queues; send and receive messages; delete a received message; purge a queue. Receiving may change message visibility; purging is destructive. |
| **SNS** | List/create/delete topics; list subscriptions; subscribe/unsubscribe endpoints; publish a message. Subscription confirmation may be required outside the app. |
| **Step Functions** | List state machines and executions; start or stop an execution; inspect execution details. |
| **EventBridge Scheduler** | List, create, and delete schedules. Creation requires a target and an execution role accepted by AWS. |
| **EventBridge Pipes** | List, create, delete, start, and stop pipes. |
| **Amazon MQ** | List brokers and reboot a broker. |
| **SES** | List/create/delete email identities; send email; list configuration sets. Identity verification and sandbox restrictions are enforced by SES. |
| **IoT Core** | List/create/delete things; list certificates and policies. |

### 4.9 Governance and account management

| Module | Available workflows |
|---|---|
| **Lake Formation** | Browse databases, tables, permissions, data lake settings, registered resources, LF-Tags, and tag permissions. Marked unsupported for emulated profiles. |
| **CloudFormation** | List stacks; inspect stack resources; delete a stack. |
| **Auto Scaling** | List Auto Scaling groups; update desired capacity; delete a group. |
| **AppConfig** | List applications, environments, configuration profiles, and deployments. |
| **Resource Groups Tagging** | List tagged resources and tag keys; add or remove tags from resource ARNs. |
| **AWS Config** | List Config rules. |
| **CloudTrail** | List trails and look up recent events. |
| **Organizations** | Describe the organization; list accounts, roots, and organizational units. Requires an Organizations management/delegated account with suitable permissions. |
| **Account** | View account contact information and list account regions. Contact information is sensitive account metadata. |

### 4.10 Cost

| Module | Available workflows |
|---|---|
| **Cost Explorer** | Retrieve cost grouped by AWS service for a selected period. Cost Explorer access and account settings must permit the request. |
| **Pricing** | List AWS service codes and search product records using the Pricing API. Pricing results are catalog data, not a bill estimate. |
| **Cost & Usage Reports** | List report definitions and delete a report definition. Deletion does not retroactively remove already delivered report objects. |

## 5. Common interaction patterns

### Inventory and detail views

Most modules begin with an inventory table or cards. Selecting a resource opens related data or operations. Refresh after a lifecycle action when the provider is eventually consistent; AWS may accept an action before the displayed status changes.

### Forms and JSON input

Creation, query, event, and invocation workflows collect the parameters required by that API. JSON fields—such as a Lambda payload, EventBridge detail, or IAM trust policy—must contain valid JSON. Service-side validation errors are returned by AWS and displayed by the application.

### Destructive and billable operations

Delete, terminate, purge, detach, disable, and stop operations can cause data loss or downtime. Creation, query, data transfer, backup, and running-resource actions may incur AWS charges. Read the confirmation dialog, verify the selected profile and resource identifier, and apply least privilege.

### Downloads and generated links

S3 and Athena can download data or generate links; Lambda can download and extract a deployment package. A presigned link grants temporary access to the signed object, so share it as sensitive data. Local filesystem paths and overwrite behavior depend on the dialog or parameters presented by the module.

## 6. Errors and troubleshooting

Backend SDK errors are converted to text and shown in the content area. Authentication-related messages—including expired or invalid tokens and access denial—receive a dedicated credentials panel.

| Symptom | Likely cause and action |
|---|---|
| No profiles on startup | Configure at least one profile in `~/.aws/credentials` or `~/.aws/config`; verify section syntax and the user's home directory. |
| Empty resource list | Check the region badge, the selected account, filters, and IAM list/describe permissions. If the profile has no region, add it to `~/.aws/config` instead of relying on the `us-east-1` fallback. |
| Expired or invalid token | Refresh SSO or temporary credentials externally, then switch/reselect the profile or restart the app. |
| Access denied | Add only the required IAM actions and resource scopes to the selected identity. |
| Emulator request fails | Verify `endpoint_url`, emulator availability, and whether it implements the specific service/API. |
| Action succeeds but status looks unchanged | Refresh after a short interval; many AWS lifecycle operations are asynchronous and eventually consistent. |
| Query returns no results | Check database/catalog, SQL, output location, workgroup/service permissions, and query execution status. |

## 7. Security guidance

- Credentials stay in the AWS SDK credential chain and are not passed to the JavaScript frontend.
- Resource data, logs, query results, secret values, and temporary STS credentials can be displayed locally; protect the workstation and screen.
- Use dedicated, least-privilege profiles. Avoid using root credentials.
- Treat custom endpoints as trusted infrastructure because all SDK requests for the selected profile may be redirected there.
- Treat presigned URLs, downloaded artifacts, secret values, and session tokens as sensitive.
- AWS Desktop Center has no application-level role model: authorization is exactly what AWS or the configured emulator allows for the selected profile.

## 8. Known limitations

- Region is configured through `~/.aws/config`, not an in-app selector; missing configuration falls back to `us-east-1`.
- Partial API coverage per service.
- No in-app credential creation, SSO login, or credential refresh.
- No multi-profile or multi-region side-by-side view.
- Emulator compatibility is not guaranteed; Redshift and Lake Formation are explicitly warned.
- No automated test suite is included in the current repository.
