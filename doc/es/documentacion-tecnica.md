# Documentación técnica

## AWS Desktop Center — Arquitectura y referencia para desarrollo

Este documento describe el repositorio en su versión `0.1.0`. La fuente de verdad es el backend Rust en `src/`, el frontend de módulos ES en `ui/` y `tauri.conf.json`.

## 1. Visión general

AWS Desktop Center es una aplicación local de escritorio con dos capas:

```text
┌──────────────────────────────────────────────────────────────┐
│ Ventana nativa Tauri                                        │
│  ui/index.html → ui/app.js → ui/services/*.js → styles.css  │
│                         │ IPC invoke() de Tauri              │
├─────────────────────────┼────────────────────────────────────┤
│ Proceso Rust            ▼                                    │
│  src/main.rs → src/aws_services/*.rs                         │
│                         │ AWS SDK for Rust / HTTPS           │
├─────────────────────────┼────────────────────────────────────┤
│ APIs de AWS o endpoint personalizado del perfil             │
└──────────────────────────────────────────────────────────────┘
```

El frontend presenta controles y datos, pero no llama a AWS directamente. Cada operación cruza el IPC de Tauri hacia un comando Rust registrado. El comando carga la configuración del perfil seleccionado, crea un cliente del SDK, realiza la solicitud asíncrona y serializa una respuesta específica hacia JavaScript.

## 2. Stack tecnológico

| Capa | Tecnología | Función |
|---|---|---|
| Shell de escritorio | Tauri 2 | Ventana nativa, assets, IPC y empaquetado |
| Backend | Rust 2021, Tokio | Orquestación asíncrona y filesystem local |
| Integración AWS | AWS SDK for Rust | Credenciales, firma, clientes y APIs |
| Serialización | Serde / serde_json | DTOs IPC y campos JSON |
| Frontend | HTML5, CSS, módulos ES nativos | SPA e interacción |
| I/O adicional | reqwest con rustls, `zip` | Descargas HTTP y extracción ZIP |
| Rutas | `dirs` | Resolución del home del usuario |

No hay Node.js, package manager, bundler ni compilación del frontend. Tauri sirve `ui/` directamente como `frontendDist`.

## 3. Estructura del repositorio

```text
aws-desktop-center/
├── src/
│   ├── main.rs                    # Entrada Tauri y registro de comandos
│   └── aws_services/
│       ├── mod.rs                 # Exports y configuración AWS compartida
│       ├── profiles.rs            # Descubrimiento de perfiles y endpoint
│       └── <service>.rs           # Comandos y DTOs de cada servicio
├── ui/
│   ├── index.html                 # Documento del webview
│   ├── app.js                     # Catálogo, navegación, perfiles y router
│   ├── styles.css                 # Tema oscuro compartido
│   ├── icons.js                   # Templates SVG
│   └── services/
│       ├── shared.js              # invoke, estado, errores y helpers
│       └── <service>.js           # Renderer y eventos por servicio
├── doc/en/ y doc/es/              # Documentación bilingüe para la web
├── img/                           # Capturas del README
├── icons/                         # Iconos de aplicación/paquete
├── bin/                           # Ejecutables Linux y Windows precompilados
├── notas/                         # Análisis y notas internas
├── Cargo.toml / Cargo.lock        # Manifiesto y dependencias bloqueadas
├── tauri.conf.json                # Ventana, producto, frontend y bundle
├── build.rs                       # Ejecuta tauri-build
├── README.md                      # Entrada al proyecto
└── LICENSE                        # Licencia MIT
```

La salida generada vive en `target/` y no debe editarse. Los binarios de `bin/` son artefactos de distribución, no código fuente.

## 4. Ciclo de vida

1. `main()` crea un `tauri::Builder`.
2. `tauri::generate_handler![]` registra cada comando invocable.
3. Tauri carga `ui/index.html`, que importa `app.js` como módulo ES.
4. `init()` invoca `get_profiles` y muestra la selección.
5. Al elegir un perfil se invoca `get_profile_info`, se guarda `{ profile, profileInfo }` y se dibuja el shell.
6. El catálogo `SERVICES` genera el tablero y la barra categorizada.
7. `loadService(id)` despacha a una función `render<Service>()` importada desde `ui/services/`.
8. El renderer llama comandos, construye HTML y conecta eventos.

El estado central es reducido:

```js
state = {
  profile,       // perfil seleccionado
  activeService, // id de catálogo activo
  profileInfo    // name, region, region_configured, endpoint_url, is_emulated
}
```

El estado de categorías contraídas se guarda en un `Set`. El renderizado es imperativo: se asignan templates a `innerHTML` y luego se conectan eventos. No existe DOM virtual.

## 5. Arquitectura del backend

### 5.1 Registro de comandos

`src/main.rs` es la lista permitida de IPC. Una función con `#[tauri::command]` no puede llamarse hasta figurar también en `tauri::generate_handler![]`. Actualmente hay **322 funciones de comando Tauri** entre perfiles y servicios.

El patrón habitual es:

```rust
#[tauri::command]
pub async fn service_operation(profile: String, /* inputs */)
    -> Result<SerializableOutput, String>
{
    let config = super::load_config(&profile).await;
    let client = aws_sdk_service::Client::new(&config);
    client.operation().send().await
        .map(/* salida SDK a DTO IPC */)
        .map_err(|error| error.to_string())
}
```

Los DTOs suelen derivar `Serialize` y las estructuras de entrada pueden derivar `Deserialize`. La conversión a DTOs pequeños evita filtrar tipos internos del SDK al contrato del frontend.

### 5.2 Configuración de AWS

`aws_services::load_config(profile)` es compartido:

```rust
let region = get_region(profile)
    .unwrap_or_else(|| DEFAULT_REGION.to_string());

defaults(BehaviorVersion::latest())
    .profile_name(profile)
    .region(Region::new(region))
    // opcionalmente .endpoint_url(...)
    .load()
    .await
```

Consecuencias relevantes:

- El perfil se entrega a la cadena estándar del SDK, compatible con archivos normales y proveedores soportados como SSO y roles asumidos.
- `get_region(profile)` lee `region` desde `[default]` o `[profile nombre]` en `~/.aws/config`. Ese valor configura los clientes compartidos del SDK.
- `DEFAULT_REGION` vale `us-east-1` y sólo se utiliza cuando la sección seleccionada no contiene un valor `region` no vacío.
- La renovación de credenciales depende del SDK/proveedor. La app no posee login ni renovación.
- La autorización IAM la aplica AWS, no un modelo local.

### 5.3 Descubrimiento de perfiles

`get_profiles()` recorre las cabeceras de ambos archivos, quita el prefijo `profile ` utilizado en config, elimina duplicados y conserva el orden de descubrimiento. Es deliberadamente más simple que el parser del SDK: descubre nombres y el SDK resuelve credenciales.

`get_profile_info()` devuelve los metadatos de endpoint y región que utiliza el shell:

```json
{
  "name": "local",
  "region": "us-west-2",
  "region_configured": true,
  "endpoint_url": "http://localhost:4566",
  "is_emulated": true
}
```

`region_configured` diferencia una región declarada explícitamente del fallback `us-east-1`. El frontend siempre muestra `region` en una insignia lateral y agrega una advertencia con un fragmento INI cuando `region_configured` es falso. Tanto `get_region()` como `get_endpoint_url()` usan un parser pequeño orientado a líneas: sólo leen `~/.aws/config`, requieren nombres de sección estándar y no implementan herencia ni toda la gramática de configuración de AWS.

### 5.4 Endpoints personalizados

`get_endpoint_url(profile)` busca manualmente `endpoint_url` en la sección de `~/.aws/config`: `[default]` o `[profile nombre]`. Cuando existe, la configuración compartida lo usa para los clientes.

`is_emulated(profile)` sólo significa que existe un endpoint; no prueba ni identifica al emulador. S3 activa además force-path-style. El catálogo frontend advierte que Redshift y Lake Formation no están soportados por los emuladores considerados durante el desarrollo.

### 5.5 Patrones de módulos

- Un archivo backend normalmente controla un cliente de AWS.
- Las vistas VPC reutilizan comandos de `ec2.rs`; Cloud Map usa `servicediscovery.rs`.
- Algunos módulos combinan clientes relacionados: CloudWatch reúne alarmas/métricas y Logs; Redshift usa APIs de administración y Data.
- La paginación se implementa por módulo; no está centralizada. Cada API debe revisar su continuation token.
- Los comandos devuelven `Result<T, String>` y convierten errores SDK/I/O normalmente con `to_string()`.
- Las operaciones de ciclo de vida suelen finalizar cuando AWS acepta la solicitud; el recurso puede continuar en transición porque no hay una capa común de waiters.

### 5.6 Filesystem y red local

Upload/download de S3 y paquetes Lambda cruzan el límite entre AWS y el filesystem. Lambda puede obtener una URL entregada por el SDK y extraer un ZIP. Deben validarse rutas, propagarse errores I/O y nunca asumir que un nombre remoto es seguro como ruta local.

## 6. Arquitectura del frontend

### 6.1 Catálogo y router

`SERVICES` en `ui/app.js` es el catálogo de producto. Cada entrada incluye `id`, nombre, icono, descripción, categoría y, opcionalmente, `unsupportedInEmulator`. `CATEGORY_ORDER` fija las diez secciones. El mismo catálogo genera tablero y navegación.

`loadService()` funciona como router con `switch`. Un servicio visible nuevo requiere:

1. entrada de catálogo;
2. import del renderer;
3. caso del router;
4. archivo renderer;
5. comandos backend registrados.

### 6.2 Renderers

Los archivos de `ui/services/` exportan su función principal y usan `invoke`, `state`, iconos, formato, escaping y errores compartidos. Normalmente:

1. invocan un listado con `state.profile`;
2. reemplazan `#content` por cards, tabs, tablas o formularios;
3. conectan clics y submits;
4. invocan detalles o mutaciones;
5. actualizan o muestran el resultado.

Como el HTML se arma con templates, los valores externos deben pasar por helpers de escaping. Se deben evitar handlers inline y JSON no confiable interpolado en atributos.

### 6.3 IPC y argumentos

JavaScript usa `invoke('command_name', { camelCaseArgument: value })`; Tauri mapea las claves a parámetros Rust. Los comandos comparten un namespace plano, por lo que la mayoría utiliza prefijos (`ec2_`, `sqs_`, `cfn_`, etc.).

### 6.4 Errores

`formatError()` identifica patrones de autenticación/autorización. Tokens vencidos o inválidos y acceso denegado reciben un panel orientado a credenciales; el resto se escapa y muestra de forma genérica. El texto original del SDK es útil para diagnóstico, pero no es un contrato estable.

## 7. Organización de servicios

La UI expone **73 módulos** en diez categorías. El número de módulos backend difiere porque `profiles.rs` es infraestructura, DynamoDB Streams posee comandos sin entrada superior en el catálogo y algunos módulos frontend comparten backend.

| Categoría | Módulos UI |
|---|---:|
| Almacenamiento | 8 |
| Bases de datos | 9 |
| Analítica | 6 |
| Cómputo | 10 |
| Redes | 9 |
| Seguridad | 9 |
| Monitoreo | 1 |
| Mensajería | 9 |
| Gobernanza | 9 |
| Costos | 3 |
| **Total** | **73** |

La [Documentación funcional](documentacion-funcional.md) contiene la matriz completa de operaciones.

## 8. Compilación y distribución

### 8.1 Requisitos

- Toolchain de Rust instalado con `rustup`.
- Dependencias Tauri/WebKitGTK. En sistemas Debian/Ubuntu:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  librsvg2-dev patchelf libgtk-3-dev
```

Los nombres varían por distribución. Para probar servicios reales se necesita un perfil AWS funcional.

### 8.2 Desarrollo

```bash
cargo run
```

No existe compilación ni watcher frontend. Se debe reiniciar/reejecutar según el flujo de desarrollo de Tauri.

### 8.3 Release

```bash
cargo build --release
./target/release/aws-desktop-center
```

En Windows: `target\release\aws-desktop-center.exe`.

### 8.4 Bundle Tauri

`tauri.conf.json` declara producto `AWS_Desktop_Center`, identificador `com.awsdesktopcenter.rust`, ventana redimensionable de 1280×720 y target AppImage activo. El bundle se invoca con una CLI de Tauri instalada; `cargo build --release` produce el ejecutable, pero no debe confundirse con todos los instaladores configurados.

También existen `bin/aws-desktop-center` y `bin/aws-desktop-center.exe`. Al publicar hay que verificar procedencia y vigencia: modificar fuentes no actualiza estos archivos.

## 9. Agregar o modificar un servicio

1. Incorporar el crate oficial `aws-sdk-*` en `Cargo.toml` y actualizar el lockfile.
2. Crear/modificar `src/aws_services/<service>.rs` con `load_config()` y DTOs serializables.
3. Exportar el módulo en `src/aws_services/mod.rs`.
4. Importarlo y registrar todos los comandos en `src/main.rs`.
5. Crear/modificar `ui/services/<service>.js` usando `shared.js`.
6. Importar el renderer, agregar catálogo y ruta en `ui/app.js`.
7. Agregar iconos sólo si los existentes no alcanzan.
8. Probar estados vacío/exitoso, acceso denegado, credenciales vencidas, paginación y confirmaciones contra AWS y el emulador objetivo.
9. Actualizar ambos idiomas de documentación y el README.

## 10. Seguridad

- Ningún secreto AWS debe enviarse al frontend; las operaciones nuevas permanecen en Rust.
- El frontend puede mostrar secretos, logs, tokens STS y contactos: escapar salida y evitar logs de consola.
- `endpoint_url` redirige solicitudes firmadas; el endpoint y transporte deben ser confiables.
- Las descargas y archivos comprimidos remotos son entrada no confiable: prevenir traversal y sobrescrituras.
- Los comandos destructivos deben requerir confirmación y mostrar un identificador inequívoco.
- IAM de mínimo privilegio es el límite principal de autorización.
- El registro de comandos Tauri es un límite de aplicación: exponer sólo lo requerido.

## 11. Calidad y deuda técnica

El repositorio no tiene pruebas automatizadas, configuración de linter ni CI. `cargo test` aún compila targets y `cargo check`/`cargo clippy` aportan diagnóstico, pero no son gates establecidos. Mejoras de alto valor: tests de transformaciones, pruebas frontend de escaping/router, paginación consistente, región configurable, endurecimiento de capabilities, automatización de releases y verificación de que los binarios correspondan al source tag.
