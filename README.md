# AWS Desktop Center

Aplicación de escritorio open source para explorar y operar servicios de AWS desde una interfaz unificada. Está construida con **Tauri 2 + Rust + AWS SDK for Rust** y un frontend modular en **HTML, CSS y JavaScript nativo**.

La versión actual incluye **73 módulos en 10 categorías**. No se limita a servicios de datos: cubre almacenamiento, bases de datos, analítica, cómputo, redes, seguridad, monitoreo, mensajería, gobernanza y costos.

> AWS Desktop Center ofrece un subconjunto práctico de operaciones por servicio. No pretende reemplazar por completo a AWS Console, AWS CLI ni la infraestructura como código.

## Capturas

![Selección de perfil](img/AWS%20Data%20Center%20%28Ubuntu%29%20-start.png)

*Selección de perfiles descubiertos en los archivos estándar de AWS.*

![Menú principal](img/AWS%20Data%20Center%20%28Ubuntu%29%20-%20main_menu.png)

*Interfaz oscura con tablero y navegación lateral por categorías.*

> Las capturas conservan nombres históricos en sus archivos; el nombre actual del producto es **AWS Desktop Center**.

## Funcionalidades destacadas

- selector de perfiles desde `~/.aws/credentials` y `~/.aws/config`;
- región configurable por perfil, visible en la barra lateral;
- tablero y barra lateral con buscador y categorías contraíbles;
- inventarios, detalles y acciones operativas sobre 73 módulos AWS;
- consultas y resultados para Athena, Redshift y RDS Data API;
- navegación de objetos, descargas, uploads y URLs prefirmadas en S3;
- gestión seleccionada de ciclo de vida para cómputo, almacenamiento, bases de datos y mensajería;
- logs, alarmas, métricas, auditoría, costos y metadatos de cuenta;
- soporte de `endpoint_url` por perfil para endpoints compatibles con AWS;
- manejo específico de credenciales vencidas y accesos denegados;
- frontend sin frameworks, Node.js, bundler ni paso de compilación.

## Servicios incluidos

| Categoría | Módulos |
|---|---|
| **Almacenamiento (8)** | S3, EBS, EFS, AWS Backup, S3 Tables, S3 Vectors, S3 Files, Transfer Family |
| **Bases de datos (9)** | DynamoDB, RDS, Redshift, ElastiCache, MemoryDB, DocumentDB, Neptune, OpenSearch, RDS Data API |
| **Analítica (6)** | Glue, Athena, Kinesis, Data Firehose, EMR, MSK (Kafka) |
| **Cómputo (10)** | Lambda, EC2, ECS, ECR, EKS, AWS Batch, CodeBuild, Elastic Beanstalk, CodeDeploy, CodePipeline |
| **Redes (9)** | VPC, API Gateway REST, API Gateway v2, Route 53, CloudFront, CloudFront KeyValueStore, Load Balancers, AppSync, Cloud Map |
| **Seguridad (9)** | IAM, STS, Secrets Manager, SSM Parameter Store, KMS, Cognito, ACM, WAF v2, Inspector |
| **Monitoreo (1)** | CloudWatch |
| **Mensajería (9)** | EventBridge, SQS, SNS, Step Functions, EventBridge Scheduler, EventBridge Pipes, Amazon MQ, SES, IoT Core |
| **Gobernanza (9)** | Lake Formation, CloudFormation, Auto Scaling, AppConfig, Resource Groups Tagging, AWS Config, CloudTrail, Organizations, Account |
| **Costos (3)** | Cost Explorer, Pricing, Cost & Usage Reports |

La [documentación funcional en español](doc/es/documentacion-funcional.md) y su [versión en inglés](doc/en/functional-documentation.md) detallan las operaciones disponibles en cada módulo.

## Consideraciones importantes

- **Región:** el backend usa la región declarada en la sección del perfil en `~/.aws/config`. Si falta, utiliza `us-east-1` como fallback y muestra una advertencia con la configuración sugerida.
- **Permisos:** cada acción se ejecuta con los permisos IAM del perfil seleccionado.
- **Cobertura:** cada módulo implementa sólo las operaciones indicadas en la documentación funcional.
- **Emuladores:** un `endpoint_url` en el perfil activa el modo emulado. La compatibilidad depende del emulador; Redshift y Lake Formation aparecen advertidos como no soportados.
- **Impacto:** crear recursos, ejecutar consultas o transferir datos puede generar cargos. Detener, terminar, purgar o eliminar puede causar indisponibilidad o pérdida de datos.

## Requisitos

### Ejecución de binarios precompilados

- Un perfil de AWS configurado.
- En Linux, las bibliotecas de runtime de WebKitGTK/GTK requeridas por Tauri.
- En WSL2, WSLg para mostrar aplicaciones gráficas.

El repositorio contiene ejecutables para Linux y Windows:

```bash
# Linux
chmod +x bin/aws-desktop-center
./bin/aws-desktop-center

# Windows (PowerShell o CMD)
bin\aws-desktop-center.exe
```

> En WSL2/WSLg suele resultar más conveniente el binario de `bin/` que AppImage. En Linux de escritorio puede utilizarse el bundle AppImage generado por Tauri.

### Compilación desde fuente

- [Rust](https://rustup.rs/) mediante `rustup`.
- Dependencias de desarrollo de Tauri/WebKitGTK en Linux. En Debian/Ubuntu:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  librsvg2-dev patchelf libgtk-3-dev
```

Los nombres de paquetes pueden variar según la distribución.

## Configuración de AWS

La aplicación descubre perfiles en los archivos estándar:

```ini
# ~/.aws/credentials
[default]
aws_access_key_id = ...
aws_secret_access_key = ...
```

También funciona con proveedores compatibles con la cadena del SDK —por ejemplo SSO, credenciales temporales o roles asumidos— cuando están correctamente configurados en los archivos de AWS. La renovación o el login se realizan fuera de la aplicación.

La región se configura en `~/.aws/config`. Para el perfil predeterminado se usa `[default]`; para un perfil con nombre, `[profile nombre]`:

```ini
[default]
region = us-west-2

[profile production]
region = eu-west-1
```

Al seleccionar un perfil, la región activa aparece en la barra lateral y se utiliza para crear los clientes del SDK. Si la clave `region` no está presente, la aplicación continúa con `us-east-1` y muestra una advertencia. Para cambiar de región se debe actualizar el perfil y volver a seleccionarlo o reiniciar la aplicación.

Para dirigir un perfil a un endpoint compatible con AWS:

```ini
# ~/.aws/config
[profile local]
region = us-east-1
endpoint_url = http://localhost:4566
```

La interfaz mostrará una insignia `EMULATED`. S3 utilizará direccionamiento por path para mejorar la compatibilidad con endpoints locales.

## Desarrollo y build

```bash
# Desarrollo
cargo run

# Ejecutable optimizado
cargo build --release
./target/release/aws-desktop-center
```

El frontend se carga directamente desde `ui/`, por lo que no hay que ejecutar `npm install` ni un build web. `tauri.conf.json` configura un bundle AppImage para Linux; generar bundles requiere una CLI de Tauri compatible además de las dependencias del sistema.

## Arquitectura

```text
ui/index.html + app.js + services/*.js
                  │
                  │ invoke() / IPC local de Tauri
                  ▼
src/main.rs + aws_services/*.rs
                  │
                  │ AWS SDK for Rust
                  ▼
       AWS o endpoint del perfil
```

- `ui/app.js`: catálogo, perfil, navegación y router.
- `ui/services/*.js`: vistas y eventos de cada módulo.
- `ui/services/shared.js`: estado, IPC, formato, escaping y errores.
- `src/main.rs`: registro explícito de comandos Tauri.
- `src/aws_services/mod.rs`: configuración compartida, región y endpoint.
- `src/aws_services/*.rs`: clientes, comandos y DTOs por servicio.

Las credenciales no se envían al frontend: el proceso Rust usa la cadena de credenciales del SDK. Los datos que devuelve AWS —incluidos secretos solicitados, logs o tokens temporales— sí pueden mostrarse en pantalla y deben tratarse como sensibles.

## Documentación

| Documento | English | Español |
|---|---|---|
| Resumen ejecutivo | [Executive Summary](doc/en/executive-summary.md) | [Resumen ejecutivo](doc/es/resumen-ejecutivo.md) |
| Guía funcional | [Functional Documentation](doc/en/functional-documentation.md) | [Documentación funcional](doc/es/documentacion-funcional.md) |
| Referencia técnica | [Technical Documentation](doc/en/technical-documentation.md) | [Documentación técnica](doc/es/documentacion-tecnica.md) |

## Estado del proyecto

- Nombre de producto: **AWS Desktop Center**.
- Paquete y binario: `aws-desktop-center`.
- Versión actual del manifiesto: `0.1.0`.
- Ventana Tauri: 1280×720, redimensionable.
- Tests/CI: el repositorio todavía no incluye una suite automatizada ni workflow de integración continua.

La implementación fue asistida por herramientas de IA bajo la dirección del autor del proyecto.

## Licencia

[MIT](LICENSE)
