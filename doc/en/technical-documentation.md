# Technical Documentation

## AWS Desktop Center — Architecture and Developer Reference

This document describes the repository at version `0.1.0`. The source of truth is the Rust backend under `src/`, the ES-module frontend under `ui/`, and `tauri.conf.json`.

## 1. System overview

AWS Desktop Center is a local two-layer desktop application:

```text
┌──────────────────────────────────────────────────────────────┐
│ Native Tauri window                                         │
│  ui/index.html → ui/app.js → ui/services/*.js → styles.css  │
│                         │ Tauri invoke() IPC                 │
├─────────────────────────┼────────────────────────────────────┤
│ Rust process            ▼                                    │
│  src/main.rs → src/aws_services/*.rs                         │
│                         │ AWS SDK for Rust / HTTPS           │
├─────────────────────────┼────────────────────────────────────┤
│ AWS APIs or profile-level custom endpoint                   │
└──────────────────────────────────────────────────────────────┘
```

The frontend renders controls and data but does not call AWS directly. Every AWS operation crosses Tauri IPC to a registered Rust command. The command loads configuration for the selected profile, creates an AWS SDK client, performs an asynchronous request, and serializes a purpose-built response back to JavaScript.

## 2. Technology stack

| Layer | Technology | Role |
|---|---|---|
| Desktop shell | Tauri 2 | Native window, asset loading, command IPC, packaging |
| Backend | Rust 2021, Tokio | Async orchestration and local filesystem work |
| AWS integration | AWS SDK for Rust | Credentials, request signing, service clients, API calls |
| Serialization | Serde / serde_json | IPC DTOs and JSON fields |
| Frontend | HTML5, CSS, native JavaScript ES modules | SPA rendering and interaction |
| Additional I/O | reqwest with rustls, `zip` | HTTP downloads and ZIP extraction where required |
| Paths | `dirs` | Resolving the user's home directory |

There is no Node.js dependency, package manager, bundler, or frontend compile step. Tauri serves `ui/` directly as `frontendDist`.

## 3. Repository layout

```text
aws-desktop-center/
├── src/
│   ├── main.rs                    # Tauri entry point and command registry
│   └── aws_services/
│       ├── mod.rs                 # Module exports and shared AWS configuration
│       ├── profiles.rs            # Profile discovery and endpoint metadata
│       └── <service>.rs           # Service-specific commands and DTOs
├── ui/
│   ├── index.html                 # Webview document
│   ├── app.js                     # Catalog, navigation, profile selection, router
│   ├── styles.css                 # Shared dark-theme styles
│   ├── icons.js                   # SVG icon templates
│   └── services/
│       ├── shared.js              # invoke wrapper, global state, errors, helpers
│       └── <service>.js           # Renderer and handlers for a service
├── doc/en/ and doc/es/            # Website-ready bilingual documentation
├── img/                           # README screenshots
├── icons/                         # Application/package icons
├── bin/                           # Precompiled Linux and Windows executables
├── notas/                         # Internal analyses and development notes
├── Cargo.toml / Cargo.lock        # Rust manifest and locked dependency graph
├── tauri.conf.json                # Window, product, frontend, bundle configuration
├── build.rs                       # Runs tauri-build
├── README.md                      # Project entry documentation
└── LICENSE                        # MIT license
```

Generated build output lives in `target/` and should not be edited. Precompiled files in `bin/` are distribution artifacts, not source.

## 4. Application lifecycle

1. `main()` creates a `tauri::Builder`.
2. `tauri::generate_handler![]` registers every callable backend command.
3. Tauri loads `ui/index.html`; it imports `app.js` as an ES module.
4. `init()` invokes `get_profiles` and renders profile selection.
5. Selecting a profile invokes `get_profile_info`, stores `{ profile, profileInfo }`, and renders the application shell.
6. The `SERVICES` catalog creates both dashboard tiles and categorized sidebar entries.
7. `loadService(id)` dispatches to a `render<Service>()` function imported from `ui/services/`.
8. Service renderers call backend commands, construct HTML, and attach event handlers.

The central frontend state is small:

```js
state = {
  profile,       // selected AWS profile name
  activeService, // current catalog id
  profileInfo    // name, region, region_configured, endpoint_url, is_emulated
}
```

Category collapsed state is kept separately in a `Set`. Rendering is imperative: template strings are assigned to `innerHTML`, then event handlers are attached to the new elements. There is no virtual DOM.

## 5. Backend architecture

### 5.1 Command registry

`src/main.rs` is the IPC allowlist. A function annotated with `#[tauri::command]` is not callable until it is also included in `tauri::generate_handler![]`. The repository currently contains **322 Tauri command functions** across profile and service modules.

Most commands follow this shape:

```rust
#[tauri::command]
pub async fn service_operation(profile: String, /* inputs */)
    -> Result<SerializableOutput, String>
{
    let config = super::load_config(&profile).await;
    let client = aws_sdk_service::Client::new(&config);
    client.operation().send().await
        .map(/* SDK output into an IPC DTO */)
        .map_err(|error| error.to_string())
}
```

DTOs generally derive `Serialize`; request structures may derive `Deserialize`. Converting SDK types to small DTOs keeps SDK internals out of the frontend contract.

### 5.2 AWS configuration

`aws_services::load_config(profile)` is shared by service modules:

```rust
let region = get_region(profile)
    .unwrap_or_else(|| DEFAULT_REGION.to_string());

defaults(BehaviorVersion::latest())
    .profile_name(profile)
    .region(Region::new(region))
    // optionally .endpoint_url(...)
    .load()
    .await
```

Important consequences:

- The selected profile is handed to the standard AWS SDK provider chain. This supports normal credential/config files and SDK-supported providers such as SSO and assumed roles.
- `get_region(profile)` reads `region` from `[default]` or `[profile name]` in `~/.aws/config`. That value configures the shared SDK clients.
- `DEFAULT_REGION` is `us-east-1` and is used only when the selected section has no non-empty `region` value.
- Credential refresh behavior belongs to the SDK/provider. The app has no login or refresh UI.
- IAM authorization is enforced by AWS, not by a local role model.

### 5.3 Profile discovery

`get_profiles()` scans section headers in both AWS files, strips the `profile ` prefix used by config sections, de-duplicates names, and returns them in discovery order. This is deliberately simpler than the SDK parser: it finds names, while the SDK resolves actual credentials.

`get_profile_info()` returns the endpoint and region metadata used by the shell:

```json
{
  "name": "local",
  "region": "us-west-2",
  "region_configured": true,
  "endpoint_url": "http://localhost:4566",
  "is_emulated": true
}
```

`region_configured` distinguishes an explicitly configured region from the `us-east-1` fallback. The frontend always displays `region` in a sidebar badge and adds a warning with an INI snippet when `region_configured` is false. Both `get_region()` and `get_endpoint_url()` use a small line-oriented parser; they read only `~/.aws/config`, require the standard section names, and do not implement inheritance or the full AWS config grammar.

### 5.4 Custom endpoints and emulators

`get_endpoint_url(profile)` manually searches the selected section of `~/.aws/config` for `endpoint_url`. The default section is `[default]`; named sections are `[profile name]`. If found, the shared SDK configuration uses that endpoint for service clients.

`is_emulated(profile)` means only “a custom endpoint exists”; it does not probe or identify an emulator. S3 additionally enables force-path-style addressing because virtual-host bucket routing is commonly unavailable locally. The frontend uses catalog flags to warn that Redshift and Lake Formation are unsupported by the emulators considered during development.

### 5.5 Service module patterns

- One backend file normally owns one AWS service client.
- VPC views reuse commands in `ec2.rs`; Cloud Map UI maps to `servicediscovery.rs`.
- Some modules combine related clients: CloudWatch includes metrics/alarms and Logs; Redshift uses management and Data APIs.
- Pagination is implemented within individual modules where needed; it is not centralized. Developers must check each AWS API's continuation token behavior.
- Commands return `Result<T, String>`. SDK and local I/O errors are normally converted with `to_string()`.
- Lifecycle operations often return after AWS accepts the request. The resource can remain transitional because the UI does not provide a shared waiter layer.

### 5.6 Local filesystem and network operations

S3 download/upload and Lambda package retrieval cross the boundary between AWS and the local filesystem. Lambda's package workflow can retrieve an SDK-provided URL and extract ZIP content. These operations must validate user-selected paths, surface I/O errors, and avoid assuming that a remote filename is safe as a local path.

## 6. Frontend architecture

### 6.1 Catalog and routing

`SERVICES` in `ui/app.js` is the product catalog. Each entry supplies `id`, display name, icon key, description, category, and optionally `unsupportedInEmulator`. `CATEGORY_ORDER` fixes the ten sidebar sections. The same catalog renders the landing grid and navigation, preventing separate menu definitions from drifting.

`loadService()` is a switch-based client router. A new visible service requires:

1. a catalog entry;
2. a renderer import;
3. a router case;
4. a service renderer file;
5. corresponding registered backend commands.

### 6.2 Service renderers

Files in `ui/services/` export their main render function. They use shared `invoke`, `state`, icon, formatting, escaping, and error helpers. Renderers typically:

1. invoke a list command with `state.profile`;
2. replace `#content` with cards, tabs, tables, forms, or an empty state;
3. bind clicks and form submissions;
4. invoke detail or mutation commands;
5. refresh or render the returned result.

Because HTML is assembled with template strings, dynamic values must pass through the shared escaping helpers whenever they can contain external data. Avoid inline event handlers and interpolating untrusted JSON directly into HTML attributes.

### 6.3 IPC naming and argument mapping

JavaScript calls `invoke('command_name', { camelCaseArgument: value })`. Tauri maps JavaScript argument keys to Rust parameters. Command names are globally flat, so most modules use prefixes (`ec2_`, `sqs_`, `cfn_`, and so on). Existing naming conventions should be followed to prevent collisions.

### 6.4 Error presentation

The shared `formatError()` inspects error text for authentication and authorization patterns. Expired/invalid tokens and access-denied responses receive a dedicated credential-oriented panel; other failures are escaped and displayed generically. The original SDK message can contain useful request context but should not be assumed stable enough for program logic.

## 7. Service organization

The UI exposes **73 modules** in ten categories. Backend module count differs because `profiles.rs` is infrastructure, DynamoDB Streams currently supports backend calls without a top-level UI catalog entry, and some UI modules share a backend service.

| Category | UI modules |
|---|---:|
| Storage | 8 |
| Database | 9 |
| Analytics | 6 |
| Compute | 10 |
| Networking | 9 |
| Security | 9 |
| Monitoring | 1 |
| Messaging | 9 |
| Governance | 9 |
| Cost | 3 |
| **Total** | **73** |

See the [Functional Documentation](functional-documentation.md) for the complete operation matrix.

## 8. Build, run, and package

### 8.1 Prerequisites

- Rust toolchain installed with `rustup`.
- Linux development packages for Tauri/WebKitGTK. On Debian/Ubuntu-family systems:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  librsvg2-dev patchelf libgtk-3-dev
```

Exact package names vary by distribution. A working AWS profile is needed for live service testing.

### 8.2 Development

```bash
cargo run
```

There is no frontend watcher or compilation phase. Restart/re-run the application after source changes as required by the Tauri development process.

### 8.3 Release binary

```bash
cargo build --release
./target/release/aws-desktop-center
```

On Windows the executable is `target\release\aws-desktop-center.exe`.

### 8.4 Tauri bundle

`tauri.conf.json` declares product name `AWS_Desktop_Center`, identifier `com.awsdesktopcenter.rust`, a 1280×720 resizable window, and an active Linux AppImage target. Tauri bundling can be invoked with an installed Tauri CLI; a normal `cargo build --release` builds the executable but should not be confused with producing every configured installer format.

The repository also contains precompiled `bin/aws-desktop-center` and `bin/aws-desktop-center.exe`. Their provenance and freshness must be verified when publishing a release; editing source does not update them.

## 9. Adding or changing a service

1. Add the required official `aws-sdk-*` crate to `Cargo.toml` and update the lockfile.
2. Create or update `src/aws_services/<service>.rs` using `load_config()` and serializable DTOs.
3. Export the module from `src/aws_services/mod.rs`.
4. Import it and register every command in `src/main.rs`.
5. Add or update `ui/services/<service>.js`, using helpers from `shared.js`.
6. Import the renderer, add its catalog entry, and route its id in `ui/app.js`.
7. Add an icon mapping only if existing icon keys are insufficient.
8. Test empty, success, access-denied, expired-credential, pagination, and destructive-confirmation paths against the intended AWS account and emulator.
9. Update both language versions of the functional and technical documentation plus the README.

## 10. Security considerations

- No AWS secret is intentionally sent to frontend code. Keep new AWS operations in Rust.
- The frontend can display sensitive returned values (secrets, logs, STS tokens, contact data); escape output and avoid console logging.
- `endpoint_url` redirects signed requests. Users must trust the configured endpoint and its transport.
- Downloaded and extracted remote content is untrusted input. Defend against path traversal and unintended overwrites.
- Destructive commands should require an explicit UI confirmation and show an unambiguous resource identifier.
- Least-privilege IAM policies are the primary authorization boundary.
- Tauri's command registry is an application boundary: expose only commands required by the UI.

## 11. Quality and known technical debt

The repository currently has no automated tests, linter configuration, or CI workflow. `cargo test` still compiles test targets, and `cargo check`/`cargo clippy` can provide compiler feedback, but they are not established project gates. High-value future work includes command-unit tests with isolated transformations, frontend tests for escaping and routers, pagination consistency, a configurable region, capability hardening, release automation, and verification that checked-in binaries match tagged source.
