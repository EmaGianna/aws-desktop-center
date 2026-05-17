# AWS Data Center

Aplicación de escritorio estilo Kodi para gestionar servicios de datos en AWS.  
Desarrollada con **Tauri 2 + Rust** (backend) y **Vanilla JS** (frontend).

## Servicios soportados

| Servicio | Funcionalidades |
|----------|----------------|
| **S3** | Navegación, upload/download, delete, copy/move, presigned URLs, búsqueda |
| **DynamoDB** | Tablas, scan, query por partition key, detalle de tabla/índices |
| **RDS** | Instancias, clusters, snapshots, start/stop, endpoints |
| **Redshift** | Clusters, query editor (Data API), tablas, snapshots |
| **Glue** | Databases, tablas, jobs (código fuente, runs, parámetros), crawlers, triggers |
| **Athena** | Editor SQL, selector de DB/output, show tables, historial, download/link resultados |
| **Lambda** | Funciones, config, env vars, invoke, logs, código fuente |
| **CloudWatch** | Alarms, log groups, streams, búsqueda en logs, métricas |
| **EventBridge** | Buses, rules, targets, enable/disable, enviar eventos |
| **Lake Formation** | Settings, databases, permissions, registered locations, LF-Tags |

## Requisitos

### Para compilar desde fuente

- Rust (rustup): https://rustup.rs
- Dependencias de sistema (Linux/WSL):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev librsvg2-dev patchelf libgtk-3-dev
  ```
- AWS CLI configurado (`~/.aws/credentials`)

### Para ejecutar el binario precompilado

- Linux/WSL2 con WSLg (Windows 11)
- Libs de sistema: `libwebkit2gtk-4.1` y `libgtk-3`
- AWS CLI configurado (`~/.aws/credentials`)

## Ejecución rápida (binario precompilado)

```bash
chmod +x bin/aws-data-center
./bin/aws-data-center
```

## Compilar desde fuente

```bash
cargo build --release
./target/release/aws-data-center
```

## Desarrollo

```bash
cargo run
```

## Autenticación

La app lee los perfiles de `~/.aws/credentials` y `~/.aws/config`.  
Al iniciar, muestra los perfiles disponibles para seleccionar.  
Los permisos sobre cada servicio dependen de las políticas IAM del perfil seleccionado.  
Si las credenciales temporales expiran, la app muestra un mensaje indicando que deben renovarse.

## Arquitectura

```
├── src/
│   ├── main.rs                 # Entry point Tauri
│   └── aws_services/
│       ├── mod.rs              # Config loader (profile + region)
│       ├── profiles.rs         # Lee ~/.aws/credentials
│       ├── s3.rs               # S3 operations
│       ├── dynamodb.rs         # DynamoDB operations
│       ├── rds.rs              # RDS operations
│       ├── redshift.rs         # Redshift + Data API
│       ├── glue.rs             # Glue catalog, jobs, crawlers, triggers
│       ├── athena.rs           # Athena queries
│       ├── lambda.rs           # Lambda functions
│       ├── cloudwatch.rs       # CloudWatch alarms, logs, metrics
│       ├── eventbridge.rs      # EventBridge buses, rules
│       └── lakeformation.rs    # Lake Formation governance
├── ui/
│   ├── index.html              # Entry point HTML
│   ├── app.js                  # Frontend logic (vanilla JS)
│   ├── styles.css              # Dark theme UI
│   └── icons.js                # SVG icons
├── tauri.conf.json             # Tauri configuration
├── Cargo.toml                  # Rust dependencies
└── bin/
    └── aws-data-center         # Binario precompilado (Linux x86_64)
```

## Stack técnico

- **Backend**: Rust + AWS SDK for Rust
- **Frontend**: Vanilla JS (sin frameworks)
- **Framework desktop**: Tauri 2 (webview nativo)
- **UI**: Dark theme estilo Kodi, navegación por tiles

## Ventajas

- Binario standalone ~60MB
- Bajo consumo de RAM (~30-50MB)
- Startup instantáneo
- Sin Node.js como dependencia
- Credenciales nunca salen de la máquina local

## Documentación / Documentation

| | English | Español |
|--|---------|---------|
| Executive Summary | [executive-summary.md](doc/en/executive-summary.md) | [resumen-ejecutivo.md](doc/es/resumen-ejecutivo.md) |
| Functional Docs | [functional-documentation.md](doc/en/functional-documentation.md) | [documentacion-funcional.md](doc/es/documentacion-funcional.md) |
| Technical Docs | [technical-documentation.md](doc/en/technical-documentation.md) | [documentacion-tecnica.md](doc/es/documentacion-tecnica.md) |

## Desarrollo asistido por IA

Este proyecto fue ideado, diseñado y dirigido por su autor.  
La implementación del código fue asistida por **Kiro CLI** (AWS), un agente de IA para desarrollo de software, utilizado como herramienta de productividad durante el proceso de construcción.
