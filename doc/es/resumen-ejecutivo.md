# Resumen ejecutivo

## AWS Desktop Center

AWS Desktop Center es una aplicación de escritorio open source para explorar y operar recursos de AWS desde una única interfaz gráfica. Combina un backend nativo en Rust, el SDK oficial de AWS para Rust y un frontend liviano en HTML, CSS y JavaScript empaquetado con Tauri 2.

El proyecto actual ya no está limitado a servicios de datos. Expone **73 módulos de servicios organizados en 10 dominios**: Almacenamiento, Bases de datos, Analítica, Cómputo, Redes, Seguridad, Monitoreo, Mensajería, Gobernanza y Costos.

## El problema que resuelve

El trabajo cotidiano en AWS suele repartirse entre la consola web, comandos de CLI, scripts y herramientas específicas. Esto genera fricción cuando un operador necesita inspeccionar varios servicios, seguir relaciones entre recursos o ejecutar una acción operativa breve. La consola de AWS es completa, pero depende del navegador y su navegación y flujos varían entre servicios.

AWS Desktop Center ofrece una alternativa enfocada para tareas frecuentes de consulta y administración:

- un único punto de entrada de escritorio para varias cuentas de AWS y emuladores locales;
- navegación consistente entre familias de servicios;
- acceso rápido a inventarios, detalles, logs, resultados de consultas y controles operativos;
- ausencia de runtime de Node.js y de una cadena de build para el frontend;
- uso local de los archivos estándar de credenciales y configuración de AWS.

Es una herramienta operativa complementaria, no un reemplazo completo de la consola de AWS, la infraestructura como código o AWS CLI. Cada módulo implementa intencionalmente un subconjunto útil de la API del servicio.

## Experiencia de uso

Al iniciar, la aplicación descubre perfiles en `~/.aws/credentials` y `~/.aws/config`. El usuario selecciona uno e ingresa a un espacio de trabajo oscuro, inspirado en un media center. Una barra lateral con buscador y un tablero de mosaicos agrupan los servicios por dominio. Las categorías pueden contraerse, el perfil seleccionado permanece visible y los perfiles con un endpoint personalizado muestran una insignia **EMULATED**.

La aplicación permite exploración de sólo lectura y también acciones seleccionadas de escritura y ciclo de vida. Por ejemplo: subir y mover objetos S3, iniciar y detener recursos de cómputo, ejecutar consultas en Athena o Redshift, invocar funciones Lambda, administrar colas y tópicos, trabajar con identidades IAM, actualizar etiquetas e inspeccionar costos. Las acciones destructivas expuestas por los módulos utilizan diálogos de confirmación en la interfaz.

## Alcance por dominio

| Dominio | Módulos incluidos |
|---|---|
| Almacenamiento | S3, EBS, EFS, AWS Backup, S3 Tables, S3 Vectors, S3 Files, Transfer Family |
| Bases de datos | DynamoDB, RDS, Redshift, ElastiCache, MemoryDB, DocumentDB, Neptune, OpenSearch, RDS Data API |
| Analítica | Glue, Athena, Kinesis, Data Firehose, EMR, MSK (Kafka) |
| Cómputo | Lambda, EC2, ECS, ECR, EKS, AWS Batch, CodeBuild, Elastic Beanstalk, CodeDeploy, CodePipeline |
| Redes | VPC, API Gateway REST, API Gateway v2, Route 53, CloudFront, CloudFront KeyValueStore, Elastic Load Balancing v2, AppSync, Cloud Map |
| Seguridad | IAM, STS, Secrets Manager, SSM Parameter Store, KMS, Cognito, ACM, WAF v2, Inspector |
| Monitoreo | CloudWatch |
| Mensajería | EventBridge, SQS, SNS, Step Functions, EventBridge Scheduler, EventBridge Pipes, Amazon MQ, SES, IoT Core |
| Gobernanza | Lake Formation, CloudFormation, Auto Scaling, AppConfig, Resource Groups Tagging, AWS Config, CloudTrail, Organizations, Account |
| Costos | Cost Explorer, Pricing, Cost & Usage Reports |

Las operaciones exactas disponibles en cada módulo se describen en la [Documentación funcional](documentacion-funcional.md).

## Usuarios objetivo

- ingenieros cloud y administradores de AWS que necesitan un inventario visual rápido;
- desarrolladores que quieren inspeccionar u operar recursos sin componer comandos de CLI;
- equipos DevOps, de plataforma, datos, seguridad y FinOps que trabajan con varios dominios;
- personas en formación que se benefician de ver los recursos agrupados en una interfaz consistente;
- equipos que usan emuladores locales compatibles con AWS mediante un endpoint configurado por perfil.

## Arquitectura y tecnología

- **Runtime de escritorio:** Tauri 2 y el webview nativo del sistema operativo.
- **Backend:** Rust 2021 con clientes asíncronos del SDK de AWS.
- **Frontend:** módulos ES nativos, HTML y CSS; sin framework ni paso de compilación.
- **Comunicación:** comandos Tauri tipados, invocados desde JavaScript mediante IPC local.
- **Autenticación:** cadena estándar de credenciales del SDK de AWS, seleccionada por perfil.
- **Distribución:** compilación desde fuente, empaquetado AppImage para Linux y ejecutables precompilados para Linux y Windows en `bin/`.

El frontend nunca recibe las credenciales de AWS. Las solicitudes las realiza el proceso Rust local y la autorización sigue gobernada por los permisos IAM del perfil elegido. La [Documentación técnica](documentacion-tecnica.md) detalla la arquitectura y el proceso de compilación.

## Limitaciones actuales

- El backend lee la región activa desde la sección del perfil seleccionado en `~/.aws/config` y la muestra en la barra lateral. Si el perfil no contiene la clave `region`, la aplicación usa **`us-east-1`** como fallback y presenta una advertencia de configuración. Los cambios de región se realizan en el perfil de AWS, no mediante un selector dentro de la aplicación.
- La cobertura de los servicios es intencionalmente parcial. Que un módulo aparezca en la interfaz no significa que exponga toda la API de AWS.
- Un perfil con `endpoint_url` en `~/.aws/config` dirige los clientes SDK compatibles a ese endpoint. La cobertura depende del emulador; la interfaz marca explícitamente Redshift y Lake Formation como no soportados en modo emulado.
- El repositorio no incluye por el momento una suite automatizada de pruebas ni un flujo de CI.
- Las acciones se ejecutan con los permisos del perfil seleccionado y pueden afectar recursos reales y generar costos.

## Valor y dirección

AWS Desktop Center reduce el cambio de contexto y ofrece una base de código compacta, auditable y multiplataforma. La estructura modular del backend y el frontend permite incorporar operaciones de nuevos servicios sin adoptar un framework web pesado.

La dirección del proyecto es crecer como un centro amplio de operaciones de AWS para escritorio, conservando tres cualidades: bajo peso local, uso transparente de las credenciales estándar de AWS y flujos enfocados, sin intentar reproducir cada pantalla de la consola web.

## Estado del proyecto

El repositorio identifica la aplicación como **AWS Desktop Center**, el paquete y binario como `aws-desktop-center`, versión `0.1.0`, bajo licencia MIT. Debe considerarse una herramienta operativa en etapa temprana: útil actualmente, pero que requiere pruebas conscientes de permisos en cada cuenta y emulador de destino antes de utilizarse en producción.
