# Technical Documentation

## AWS Desktop Center — Architecture & Technical Reference

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Tauri Webview                      │
│  ┌───────────────────────────────────────────────┐  │
│  │           Frontend (Vanilla JS)                │  │
│  │  index.html + app.js + styles.css + icons.js  │  │
│  └───────────────────────────────────────────────┘  │
│                        │ IPC (invoke)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │            Backend (Rust)                      │  │
│  │  ┌─────────────┐  ┌────────────────────────┐ │  │
│  │  │  AWS SDK    │  │  Credential Provider   │ │  │
│  │  │  (10 svcs)  │  │  (~/.aws/credentials)  │ │  │
│  │  └─────────────┘  └────────────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Desktop framework | Tauri 2 | Native webview, small binary, no Chromium |
| Backend language | Rust | Performance, safety, excellent AWS SDK |
| Frontend | Vanilla JS | Zero dependencies, fast load, simple maintenance |
| AWS interaction | aws-sdk-rust | Official SDK, async, credential chain support |
| HTTP client | reqwest | For Lambda code download (zip from presigned URL) |
| Zip extraction | zip crate | For Lambda deployment package extraction |

### Project Structure

```
aws-desktop-center/
├── Cargo.toml              # Rust dependencies and project metadata
├── Cargo.lock              # Locked dependency versions
├── build.rs                # Tauri build script
├── tauri.conf.json         # Tauri app configuration
├── icons/
│   ├── icon.png            # App icon (Linux)
│   └── icon.ico            # App icon (Windows)
├── src/
│   ├── main.rs             # Tauri builder + command registration
│   └── aws_services/
│       ├── mod.rs           # Shared config loader
│       ├── profiles.rs      # AWS profile reader
│       ├── s3.rs            # 10 commands
│       ├── dynamodb.rs      # 4 commands
│       ├── rds.rs           # 5 commands
│       ├── redshift.rs      # 6 commands
│       ├── glue.rs          # 10 commands
│       ├── athena.rs        # 8 commands
│       ├── lambda.rs        # 5 commands
│       ├── cloudwatch.rs    # 6 commands
│       ├── eventbridge.rs   # 6 commands
│       └── lakeformation.rs # 7 commands
├── ui/
│   ├── index.html           # Entry point
│   ├── app.js               # All frontend logic (~2000 lines)
│   ├── styles.css           # Dark theme styles
│   └── icons.js             # SVG icon definitions
├── bin/
│   ├── aws-desktop-center      # Precompiled binary (Linux x86_64)
│   └── aws-desktop-center.exe  # Precompiled binary (Windows x86_64)
└── doc/
    ├── en/                   # English documentation
    └── es/                   # Spanish documentation
```

### Backend Architecture

#### Configuration Loading

All services share a common config loader (`mod.rs`):

```rust
pub async fn load_config(profile: &str) -> aws_config::SdkConfig {
    defaults(BehaviorVersion::latest())
        .profile_name(profile)
        .region(Region::new("us-east-1"))
        .load()
        .await
}
```

This supports:
- Named profiles from `~/.aws/credentials`
- SSO profiles from `~/.aws/config`
- Temporary credentials (session tokens)
- IAM role assumption

#### Command Pattern

Each service module exposes Tauri commands using the `#[tauri::command]` macro:

```rust
#[tauri::command]
pub async fn list_buckets(profile: String) -> Result<Vec<Bucket>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    // ... AWS API call
}
```

Commands are registered in `main.rs` via `generate_handler![]`.

#### Error Handling

All AWS errors are converted to `String` via `.map_err(|e| e.to_string())` and propagated to the frontend, where `formatError()` detects credential expiration patterns.

### Frontend Architecture

#### Single-Page Application

The frontend is a single `app.js` file implementing a client-side router:

```
init() → renderProfileSelector() → renderApp() → loadService(id) → renderXxx()
```

#### State Management

Minimal global state:
```javascript
let state = { profile: null, activeService: null };
```

#### IPC Communication

Frontend communicates with Rust via Tauri's `invoke()`:
```javascript
const buckets = await invoke('list_buckets', { profile: state.profile });
```

#### UI Components

All UI is rendered via template literals (no virtual DOM, no framework):
- Tiles grid for resource listing
- Detail panels with info cards
- Tables for tabular data
- Modal dialogs for confirmations and inputs
- Side panels for object details

### Dependencies (Cargo.toml)

| Crate | Purpose |
|-------|---------|
| tauri | Desktop framework |
| serde / serde_json | Serialization |
| tokio | Async runtime |
| aws-config | AWS configuration |
| aws-sdk-s3 | S3 operations |
| aws-sdk-dynamodb | DynamoDB operations |
| aws-sdk-rds | RDS operations |
| aws-sdk-redshift | Redshift management |
| aws-sdk-redshiftdata | Redshift Data API (queries) |
| aws-sdk-glue | Glue catalog, jobs, crawlers |
| aws-sdk-athena | Athena queries |
| aws-sdk-lambda | Lambda functions |
| aws-sdk-cloudwatch | CloudWatch alarms, metrics |
| aws-sdk-cloudwatchlogs | CloudWatch Logs |
| aws-sdk-eventbridge | EventBridge |
| aws-sdk-lakeformation | Lake Formation |
| aws-sdk-sts | STS (identity) |
| reqwest | HTTP client (Lambda code download) |
| zip | Zip extraction (Lambda packages) |
| dirs | Home directory resolution |

### Build & Distribution

#### Development
```bash
cargo run
```

#### Release Build
```bash
cargo build --release
# Binary: target/release/aws-desktop-center (Linux) or aws-desktop-center.exe (Windows)
```

#### AppImage (Linux portable)
```bash
cargo tauri build
# Output: target/release/bundle/appimage/AWS_Desktop_Center_0.1.0_amd64.AppImage
```

### Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Linux (native) | ✅ | Requires libwebkit2gtk-4.1, libgtk-3 |
| WSL2 + WSLg | ✅ | Windows 11 required for WSLg |
| Windows (native) | ✅ | Compiled with MSVC toolchain |
| macOS | ⚠️ | Not tested, should compile with Tauri |

### Security Considerations

- No telemetry or external network calls (except to AWS APIs)
- Credentials read from local filesystem only
- Pre-signed URLs generated client-side
- Context isolation enabled (Tauri security model)
- No `nodeIntegration`, no `eval()`, no remote code execution
