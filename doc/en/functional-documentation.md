# Functional Documentation

## AWS Data Center — User Guide

### Getting Started

1. Launch the application (`./aws-data-center` on Linux or `aws-data-center.exe` on Windows)
2. Select an AWS profile from the list (profiles are read from `~/.aws/credentials` and `~/.aws/config`)
3. Navigate services using the sidebar or the tile grid on the home screen

### Service Modules

---

## S3 — Object Storage

**Main View**: Displays all S3 buckets with a filter bar.

**Bucket View**: Navigate folders and files within a bucket.

**Actions on objects**:
- **Info** — View object details: size, last modified, content type, ETag, storage class, metadata, tags
- **Download** — Download object to a local path
- **Copy** — Copy or move object to another bucket/key
- **Delete** — Delete object (with confirmation)
- **Generate Link** — Create a pre-signed URL (1 hour expiry)

**Search**: Search objects by name within a bucket (searches all prefixes).

**Upload**: Upload a local file to the current prefix.

---

## DynamoDB — NoSQL Database

**Main View**: Lists all tables with filter.

**Table Detail**:
- Table info: status, item count, size, billing mode, creation date
- Keys: partition key, sort key, GSI, LSI
- **Scan tab**: Scan up to 50 items
- **Query tab**: Query by partition key value (and optional sort key prefix)
- **View item**: Click "View" on any row to see full item attributes in a side panel

---

## RDS — Relational Database Service

**Main View**: Lists clusters and instances with filter. Status is color-coded.

**Instance Detail**:
- Configuration: engine, version, class, multi-AZ, availability zone
- Connection: endpoint, port, VPC
- Storage: allocated GB, type, backup retention
- Snapshots: list of available snapshots
- Actions: Start/Stop instance (with confirmation)

**Cluster Detail**:
- Configuration: engine, version, multi-AZ, encrypted, backup retention
- Endpoints: writer and reader endpoints, port
- Members: list of instances with writer/reader role

---

## Redshift — Data Warehouse

**Main View**: Lists clusters with filter.

**Cluster Detail**:
- Info: node type, nodes, version, AZ, encrypted, creation date
- Connection: endpoint, port, database, master user, VPC
- **Query Editor tab**: Execute SQL via Redshift Data API with result polling
- **Tables tab**: List schemas/tables from the catalog with filter
- **Snapshots tab**: List cluster snapshots

---

## Glue — ETL Service

**Tabs**: Databases | Jobs | Crawlers | Triggers

**Databases**:
- List with filter, click to see tables
- Table detail: columns (name, type, comment), partition keys, location, format, SerDe

**Jobs**:
- List with filter, click for detail
- Job detail: type, Glue version, Python version, workers, timeout, retries, script location
- Parameters: table with all default arguments
- **View Source**: Download and display the job script from S3
- **Download**: Save script to local path
- **Start Job**: Execute with confirmation
- **Job Runs tab**: History with status, duration, errors

**Crawlers**:
- List with filter, click for detail
- Detail: state, database, schedule, targets, last crawl info
- **Start Crawler**: Execute with confirmation

**Triggers**:
- List with filter, state color-coded (green=activated, red=deactivated)
- Detail: type, state, schedule, associated jobs
- **Activate/Deactivate**: Toggle trigger state with confirmation

---

## Athena — Query Service

**Tabs**: Query Editor | History | Saved Queries

**Query Editor**:
- Database selector (loaded from Glue catalog)
- Output location selector (auto-populated with S3 buckets containing "athena")
- **Show Tables**: Side panel listing tables of selected database (click to auto-generate SELECT)
- SQL editor with execution and result polling
- Results displayed in table (limited to ~200 rows for display)
- **Download Full CSV**: Download complete result from S3
- **Generate Link**: Pre-signed URL to the CSV (1 hour expiry)

**History**:
- Table with query, database, status, duration, data scanned, date
- Filter bar
- **Reuse**: Load query back into editor

**Saved Queries**:
- List of named queries saved in Athena
- Click to load into editor

---

## Lambda — Serverless Functions

**Main View**: Lists all functions (paginated) with filter.

**Function Detail**:
- Configuration: runtime, handler, memory, timeout, code size, architecture, last modified
- Role: IAM role ARN
- Layers: list of associated layers
- Environment Variables: table with all env vars

**Tabs**:
- **Invoke**: JSON payload editor + invoke button. Shows status code, error, and response
- **Recent Logs**: Last log events from CloudWatch
- **Code**: Downloads and displays the function source code (extracted from deployment .zip)

---

## CloudWatch — Monitoring & Logs

**Tabs**: Alarms | Log Groups | Metrics

**Alarms**:
- List with filter, state color-coded (green=OK, red=ALARM, orange=INSUFFICIENT_DATA)
- Detail: metric, namespace, comparison, threshold, period, eval periods, state reason, actions

**Log Groups**:
- List with filter (all groups, paginated)
- Click to view streams
- **Search**: Filter pattern search within last hour
- **Streams**: Click to view log events with timestamps

**Metrics**:
- Input namespace (e.g., AWS/Lambda, AWS/RDS)
- Table with metric name, namespace, dimensions
- Filter bar

---

## EventBridge — Event Bus

**Main View**: Lists event buses with filter.

**Bus View**:
- Lists rules with filter, state color-coded
- **Send Test Event**: Send a custom event to the bus

**Rule Detail**:
- Configuration: state, bus, schedule, description
- Targets: list with ID, ARN, input
- Event Pattern: formatted JSON
- **Enable/Disable Rule**: Toggle with confirmation

---

## Lake Formation — Data Governance

**Tabs**: Settings | Databases | Permissions | Registered Locations | LF-Tags | Tag Permissions

**Settings**: Data lake admins, default permissions for database/table creation.

**Databases**: List from Glue catalog with filter. Click to see tables.

**Permissions**: Table with principal, resource, permissions, grant options. Filterable.

**Registered Locations**: S3 locations registered with their IAM roles.

**LF-Tags**: Tags defined with their possible values.

**Tag Permissions**: Permissions associated with LF-Tags (tag-based access control).

---

### Error Handling

- If AWS credentials expire, the app displays a clear message indicating credentials need to be renewed
- All errors show the original AWS error detail for troubleshooting

### Security

- Credentials are read from local `~/.aws/credentials` only
- No data is sent to external servers
- Pre-signed URLs are generated locally using AWS SDK
