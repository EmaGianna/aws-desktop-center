# Documentación Técnica

## AWS Data Center — Arquitectura y Referencia Técnica

### Arquitectura General

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

### Decisiones Tecnológicas

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Framework de escritorio | Tauri 2 | Webview nativo, binario pequeño, sin Chromium |
| Lenguaje backend | Rust | Rendimiento, seguridad, excelente AWS SDK |
| Frontend | Vanilla JS | Cero dependencias, carga rápida, mantenimiento simple |
| Interacción AWS | aws-sdk-rust | SDK oficial, async, soporte de cadena de credenciales |
| Cliente HTTP | reqwest | Para descarga de código Lambda (zip desde URL pre-firmada) |
| Extracción zip | crate zip | Para extraer paquetes de deployment de Lambda |

### Estructura del Proyecto

```
aws-data-center/
├── Cargo.toml              # Dependencias Rust y metadata del proyecto
├── Cargo.lock              # Versiones de dependencias bloqueadas
├── build.rs                # Script de build de Tauri
├── tauri.conf.json         # Configuración de la app Tauri
├── icons/
│   ├── icon.png            # Ícono de la app (Linux)
│   └── icon.ico            # Ícono de la app (Windows)
├── src/
│   ├── main.rs             # Builder de Tauri + registro de comandos
│   └── aws_services/
│       ├── mod.rs           # Config loader compartido
│       ├── profiles.rs      # Lector de perfiles AWS
│       ├── s3.rs            # 10 comandos
│       ├── dynamodb.rs      # 4 comandos
│       ├── rds.rs           # 5 comandos
│       ├── redshift.rs      # 6 comandos
│       ├── glue.rs          # 10 comandos
│       ├── athena.rs        # 8 comandos
│       ├── lambda.rs        # 5 comandos
│       ├── cloudwatch.rs    # 6 comandos
│       ├── eventbridge.rs   # 6 comandos
│       └── lakeformation.rs # 7 comandos
├── ui/
│   ├── index.html           # Entry point
│   ├── app.js               # Toda la lógica frontend (~2000 líneas)
│   ├── styles.css           # Estilos dark theme
│   └── icons.js             # Definiciones de íconos SVG
├── bin/
│   ├── aws-data-center      # Binario precompilado (Linux x86_64)
│   └── aws-data-center.exe  # Binario precompilado (Windows x86_64)
└── doc/
    ├── en/                   # Documentación en inglés
    └── es/                   # Documentación en español
```

### Arquitectura del Backend

#### Carga de Configuración

Todos los servicios comparten un config loader común (`mod.rs`):

```rust
pub async fn load_config(profile: &str) -> aws_config::SdkConfig {
    defaults(BehaviorVersion::latest())
        .profile_name(profile)
        .region(Region::new("us-east-1"))
        .load()
        .await
}
```

Soporta:
- Perfiles nombrados de `~/.aws/credentials`
- Perfiles SSO de `~/.aws/config`
- Credenciales temporales (session tokens)
- Asunción de roles IAM

#### Patrón de Comandos

Cada módulo de servicio expone comandos Tauri usando el macro `#[tauri::command]`:

```rust
#[tauri::command]
pub async fn list_buckets(profile: String) -> Result<Vec<Bucket>, String> {
    let config = load_config(&profile).await;
    let client = Client::new(&config);
    // ... llamada a API de AWS
}
```

Los comandos se registran en `main.rs` via `generate_handler![]`.

#### Manejo de Errores

Todos los errores de AWS se convierten a `String` via `.map_err(|e| e.to_string())` y se propagan al frontend, donde `formatError()` detecta patrones de expiración de credenciales.

### Arquitectura del Frontend

#### Single-Page Application

El frontend es un único archivo `app.js` que implementa un router del lado del cliente:

```
init() → renderProfileSelector() → renderApp() → loadService(id) → renderXxx()
```

#### Gestión de Estado

Estado global mínimo:
```javascript
let state = { profile: null, activeService: null };
```

#### Comunicación IPC

El frontend se comunica con Rust via `invoke()` de Tauri:
```javascript
const buckets = await invoke('list_buckets', { profile: state.profile });
```

#### Componentes de UI

Toda la UI se renderiza via template literals (sin virtual DOM, sin framework):
- Grid de tiles para listado de recursos
- Paneles de detalle con tarjetas de información
- Tablas para datos tabulares
- Diálogos modales para confirmaciones e inputs
- Paneles laterales para detalles de objetos

### Dependencias (Cargo.toml)

| Crate | Propósito |
|-------|-----------|
| tauri | Framework de escritorio |
| serde / serde_json | Serialización |
| tokio | Runtime async |
| aws-config | Configuración AWS |
| aws-sdk-s3 | Operaciones S3 |
| aws-sdk-dynamodb | Operaciones DynamoDB |
| aws-sdk-rds | Operaciones RDS |
| aws-sdk-redshift | Gestión Redshift |
| aws-sdk-redshiftdata | Redshift Data API (queries) |
| aws-sdk-glue | Catálogo Glue, jobs, crawlers |
| aws-sdk-athena | Queries Athena |
| aws-sdk-lambda | Funciones Lambda |
| aws-sdk-cloudwatch | Alarmas y métricas CloudWatch |
| aws-sdk-cloudwatchlogs | CloudWatch Logs |
| aws-sdk-eventbridge | EventBridge |
| aws-sdk-lakeformation | Lake Formation |
| aws-sdk-sts | STS (identidad) |
| reqwest | Cliente HTTP (descarga de código Lambda) |
| zip | Extracción de zip (paquetes Lambda) |
| dirs | Resolución de directorio home |

### Build y Distribución

#### Desarrollo
```bash
cargo run
```

#### Build Release
```bash
cargo build --release
# Binario: target/release/aws-data-center (Linux) o aws-data-center.exe (Windows)
```

#### AppImage (Linux portable)
```bash
cargo tauri build
# Output: target/release/bundle/appimage/AWS_Data_Center_0.1.0_amd64.AppImage
```

### Soporte de Plataformas

| Plataforma | Estado | Notas |
|----------|--------|-------|
| Linux (nativo) | ✅ | Requiere libwebkit2gtk-4.1, libgtk-3 |
| WSL2 + WSLg | ✅ | Requiere Windows 11 para WSLg |
| Windows (nativo) | ✅ | Compilado con toolchain MSVC |
| macOS | ⚠️ | No testeado, debería compilar con Tauri |

### Consideraciones de Seguridad

- Sin telemetría ni llamadas de red externas (excepto a APIs de AWS)
- Credenciales leídas únicamente del filesystem local
- URLs pre-firmadas generadas del lado del cliente
- Context isolation habilitado (modelo de seguridad de Tauri)
- Sin `nodeIntegration`, sin `eval()`, sin ejecución de código remoto
