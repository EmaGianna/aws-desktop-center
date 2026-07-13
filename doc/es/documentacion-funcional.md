# Documentación funcional

## AWS Desktop Center — Guía de usuario

Esta guía describe el comportamiento implementado por la aplicación actual. AWS Desktop Center ofrece flujos seleccionados para 73 módulos de AWS; no expone todas las APIs de cada servicio.

## 1. Antes de comenzar

Se necesita un perfil de AWS en uno o ambos archivos estándar:

- `~/.aws/credentials`
- `~/.aws/config`

El perfil puede usar claves persistentes, credenciales temporales, SSO, un rol asumido u otro proveedor compatible con la cadena de credenciales del SDK de AWS. Debe contar con permisos IAM para cada operación que se quiera utilizar. La aplicación no crea credenciales ni concede permisos.

La versión actual lee la región del SDK desde la sección del perfil seleccionado en `~/.aws/config`. La región activa aparece en la barra lateral. Si el perfil no define `region`, la aplicación usa **`us-east-1`** como fallback y muestra una advertencia con la configuración que debe agregarse. Conviene confirmar que los recursos esperados estén en la región mostrada. Los servicios globales y las operaciones con un campo explícito de región constituyen excepciones.

## 2. Inicio y navegación

1. Ejecutar `aws-desktop-center`.
2. Seleccionar uno de los perfiles descubiertos. La aplicación lee los nombres de sección de ambos archivos de AWS y elimina duplicados.
3. Abrir un servicio desde el tablero de mosaicos o la barra lateral categorizada.
4. Filtrar la barra con **Search services...**. Un clic en la cabecera de una categoría la contrae o expande.
5. Comprobar el perfil, la región activa y la insignia opcional del endpoint emulado antes de operar.
6. Usar **Switch Profile** para regresar a la selección. La interfaz sólo conserva en memoria el perfil elegido, sus datos de región/endpoint y el servicio activo.

Al abrir un módulo, normalmente se carga de inmediato su primer inventario. Las vistas de detalle y pestañas generan llamadas adicionales. Se muestra un indicador durante la espera y un estado vacío cuando la API no devuelve recursos.

## 3. Perfiles, regiones y endpoints emulados

La aplicación lee `region` directamente de la sección seleccionada en `~/.aws/config`:

```ini
[default]
region = us-west-2

[profile production]
region = eu-west-1
```

Se utiliza `[default]` para el perfil predeterminado y `[profile nombre]` para uno con nombre. El valor configura los clientes compartidos del SDK y aparece junto al perfil en la barra lateral. Si la clave falta o está vacía, se utiliza `us-east-1` y un panel de advertencia muestra la sección exacta que debe agregarse. Después de editar el archivo hay que cambiar de perfil o reiniciar la aplicación para volver a cargar los metadatos y las vistas. No existe un editor de región dentro de la aplicación ni una vista multirregión simultánea.

Un perfil puede redirigir las llamadas del SDK a un endpoint compatible con AWS agregando `endpoint_url` a su sección en `~/.aws/config`:

```ini
[profile local]
region = us-east-1
endpoint_url = http://localhost:4566
```

Al seleccionarlo, la barra lateral muestra `EMULATED: <endpoint>`. En este modo S3 fuerza el direccionamiento de buckets por path. Los emuladores difieren entre sí, por lo que una operación visible puede no estar implementada en el emulador activo. Redshift y Lake Formation presentan una advertencia explícita porque los emuladores contemplados por el proyecto no los soportan.

## 4. Catálogo de servicios y operaciones

### 4.1 Almacenamiento

| Módulo | Flujos disponibles |
|---|---|
| **S3** | Listar buckets y navegar objetos/prefijos; inspeccionar metadatos; buscar por prefijo; subir y descargar; eliminar, copiar y mover objetos; generar URLs prefirmadas de descarga. En modo emulado utiliza direccionamiento por path. |
| **EBS** | Listar volúmenes y snapshots; crear/eliminar volúmenes; adjuntar/separar volúmenes; crear/eliminar snapshots. |
| **EFS** | Listar, crear y eliminar sistemas de archivos; listar, crear y eliminar mount targets. |
| **AWS Backup** | Listar bóvedas y planes; explorar puntos de recuperación; iniciar un trabajo de backup. |
| **S3 Tables** | Listar/crear/eliminar table buckets; listar namespaces y tablas. |
| **S3 Vectors** | Listar/crear/eliminar vector buckets; listar índices vectoriales. |
| **S3 Files** | Listar/crear/eliminar sistemas de archivos y sus mount targets. La disponibilidad depende de la API correspondiente y del acceso de la cuenta. |
| **Transfer Family** | Listar servidores; iniciar, detener o eliminar un servidor; listar y eliminar usuarios. |

### 4.2 Bases de datos

| Módulo | Flujos disponibles |
|---|---|
| **DynamoDB** | Listar tablas; ver esquema, claves, índices, estado y capacidad; escanear ítems; consultar por partition key. |
| **RDS** | Listar instancias, clusters y snapshots; inspeccionar motores, estado, endpoints y configuración; iniciar o detener instancias. |
| **Redshift** | Listar clusters y snapshots; listar tablas mediante Redshift Data API; enviar SQL, consultar su estado y ver las filas devueltas. Marcado como no soportado en perfiles emulados. |
| **ElastiCache** | Listar cache clusters; crear y eliminar clusters. |
| **MemoryDB** | Listar, crear y eliminar clusters. |
| **DocumentDB** | Listar clusters; iniciarlos y detenerlos. |
| **Neptune** | Listar clusters e instancias de base de datos. |
| **OpenSearch** | Listar dominios; crear y eliminar dominios. |
| **RDS Data API** | Ejecutar SQL con resource ARN, secret ARN, base de datos y contexto de transacción opcional provistos por el usuario. |

### 4.3 Analítica

| Módulo | Flujos disponibles |
|---|---|
| **Glue** | Explorar bases y tablas del Data Catalog; listar jobs, revisar ejecuciones y código fuente e iniciarlos con argumentos; listar/iniciar crawlers; listar/iniciar/detener triggers. |
| **Athena** | Listar bases del catálogo y consultas guardadas; revisar historial; redactar y ejecutar SQL con base y salida S3; consultar estado; mostrar resultados; descargarlos o generar un enlace al objeto de resultados. |
| **Kinesis** | Listar, crear y eliminar streams; escribir un registro; leer registros de un shard. |
| **Data Firehose** | Listar delivery streams; escribir un registro; eliminar un delivery stream. |
| **EMR** | Listar clusters y sus steps; terminar un cluster. |
| **MSK (Kafka)** | Listar clusters y brokers; eliminar un cluster. |

### 4.4 Cómputo y entrega

| Módulo | Flujos disponibles |
|---|---|
| **Lambda** | Listar funciones y configuración; inspeccionar variables de entorno; invocar con JSON; leer logs recientes de CloudWatch; obtener datos del código y descargar/extraer el paquete de despliegue. |
| **EC2** | Listar instancias; iniciar, detener, reiniciar o terminar una instancia. La terminación es destructiva. |
| **ECS** | Listar clusters, servicios y tasks; detener una task; actualizar la cantidad deseada de un servicio. |
| **ECR** | Listar repositorios e imágenes; crear o eliminar un repositorio. |
| **EKS** | Listar clusters y node groups. |
| **AWS Batch** | Listar entornos de cómputo, colas y jobs; enviar, cancelar o terminar jobs. |
| **CodeBuild** | Listar proyectos y builds; iniciar o detener un build. |
| **Elastic Beanstalk** | Listar aplicaciones y entornos; reiniciar los servidores de aplicación de un entorno. |
| **CodeDeploy** | Listar aplicaciones, grupos y despliegues; detener un despliegue. |
| **CodePipeline** | Listar pipelines; ver su estado; iniciar una ejecución; eliminar un pipeline. |

### 4.5 Redes y APIs

| Módulo | Flujos disponibles |
|---|---|
| **VPC** | Listar VPCs, subnets, security groups y route tables mediante APIs de EC2. |
| **API Gateway (REST)** | Listar APIs REST; explorar recursos y stages; eliminar una API. |
| **API Gateway v2** | Listar APIs HTTP/WebSocket; explorar rutas y stages; eliminar una API. |
| **Route 53** | Listar, crear y eliminar hosted zones; listar registros; crear o actualizar un registro mediante UPSERT. |
| **CloudFront** | Listar distribuciones; crear una invalidación de caché para determinados paths. |
| **CloudFront KeyValueStore** | Listar y crear almacenes clave-valor. |
| **Load Balancers** | Listar load balancers ALB/NLB y target groups; revisar salud de targets; eliminar un load balancer. |
| **AppSync** | Listar APIs GraphQL y data sources; eliminar una API. |
| **Cloud Map** | Listar namespaces, servicios e instancias; eliminar un servicio. |

### 4.6 Seguridad e identidad

| Módulo | Flujos disponibles |
|---|---|
| **IAM** | Listar/crear/eliminar usuarios y roles; listar grupos y policies; inspeccionar policies adjuntas a usuarios y roles; adjuntar/separar una managed policy de un usuario. |
| **STS** | Mostrar la identidad actual; solicitar credenciales temporales mediante AssumeRole o GetSessionToken. Las credenciales se muestran para ese flujo; la autenticación general sigue basada en el perfil seleccionado. |
| **Secrets Manager** | Listar secretos; solicitar su valor; crear, actualizar o programar la eliminación. El valor es sensible y queda visible en la interfaz al solicitarlo. |
| **SSM Parameter Store** | Listar parámetros; recuperar un parámetro, opcionalmente descifrado; crear/actualizar y eliminar parámetros. |
| **KMS** | Listar y crear claves; habilitarlas/deshabilitarlas; programar su eliminación. |
| **Cognito** | Listar/crear/eliminar user pools; listar, habilitar, deshabilitar o eliminar usuarios. |
| **ACM** | Listar certificados; solicitar y eliminar certificados. La validación del dominio continúa realizándose en AWS. |
| **WAF v2** | Listar web ACLs e IP sets; crear/eliminar IP sets. El scope es importante: los recursos regionales y de CloudFront son diferentes. |
| **Inspector** | Listar findings; habilitar o deshabilitar tipos de recursos para el escaneo de Inspector en la cuenta. |

### 4.7 Monitoreo

| Módulo | Flujos disponibles |
|---|---|
| **CloudWatch** | Listar alarmas y métricas; explorar log groups y streams; leer eventos; filtrar/buscar logs. Combina las APIs de CloudWatch y CloudWatch Logs. |

### 4.8 Mensajería e integración

| Módulo | Flujos disponibles |
|---|---|
| **EventBridge** | Listar buses, reglas y targets; habilitar/deshabilitar reglas; enviar un evento personalizado. |
| **SQS** | Listar/crear/eliminar colas; enviar y recibir mensajes; eliminar un mensaje recibido; purgar una cola. La recepción puede cambiar la visibilidad y la purga es destructiva. |
| **SNS** | Listar/crear/eliminar tópicos; listar suscripciones; suscribir/desuscribir endpoints; publicar mensajes. La confirmación puede requerirse fuera de la app. |
| **Step Functions** | Listar state machines y ejecuciones; iniciar o detener una ejecución; inspeccionar detalles. |
| **EventBridge Scheduler** | Listar, crear y eliminar schedules. La creación requiere un target y rol de ejecución aceptados por AWS. |
| **EventBridge Pipes** | Listar, crear, eliminar, iniciar y detener pipes. |
| **Amazon MQ** | Listar brokers y reiniciar un broker. |
| **SES** | Listar/crear/eliminar identidades de email; enviar correo; listar configuration sets. SES aplica la verificación y restricciones de sandbox. |
| **IoT Core** | Listar/crear/eliminar things; listar certificados y policies. |

### 4.9 Gobernanza y cuenta

| Módulo | Flujos disponibles |
|---|---|
| **Lake Formation** | Explorar bases, tablas, permisos, configuración del data lake, recursos registrados, LF-Tags y permisos de tags. Marcado como no soportado en perfiles emulados. |
| **CloudFormation** | Listar stacks; inspeccionar sus recursos; eliminar un stack. |
| **Auto Scaling** | Listar grupos; actualizar capacidad deseada; eliminar un grupo. |
| **AppConfig** | Listar aplicaciones, entornos, perfiles de configuración y despliegues. |
| **Resource Groups Tagging** | Listar recursos etiquetados y claves; agregar o quitar tags mediante ARN. |
| **AWS Config** | Listar reglas de Config. |
| **CloudTrail** | Listar trails y buscar eventos recientes. |
| **Organizations** | Describir la organización; listar cuentas, roots y unidades organizativas. Requiere una cuenta de administración/delegada y permisos adecuados. |
| **Account** | Ver información de contacto y listar regiones de la cuenta. Los datos de contacto son metadatos sensibles. |

### 4.10 Costos

| Módulo | Flujos disponibles |
|---|---|
| **Cost Explorer** | Recuperar costos agrupados por servicio de AWS para un período. El acceso y configuración de la cuenta deben permitirlo. |
| **Pricing** | Listar códigos de servicios y buscar productos en la API de Pricing. Son datos de catálogo, no una estimación de factura. |
| **Cost & Usage Reports** | Listar definiciones de reportes y eliminarlas. La eliminación no borra objetos ya entregados. |

## 5. Patrones comunes de interacción

### Inventarios y detalles

La mayoría de los módulos comienza con una tabla o tarjetas de inventario. Seleccionar un recurso abre datos relacionados u operaciones. Después de una acción de ciclo de vida puede ser necesario actualizar: AWS puede aceptar una solicitud antes de reflejar el nuevo estado.

### Formularios y entrada JSON

Los flujos de creación, consulta, eventos e invocación solicitan los parámetros requeridos por la API. Los campos JSON —como un payload de Lambda, detalle de EventBridge o trust policy de IAM— deben contener JSON válido. La aplicación muestra los errores de validación devueltos por el servicio.

### Operaciones destructivas y facturables

Eliminar, terminar, purgar, separar, deshabilitar y detener puede provocar pérdida de datos o indisponibilidad. Crear recursos, consultar, transferir datos, hacer backups o mantener recursos activos puede generar cargos. Se debe leer la confirmación, comprobar el perfil y el identificador, y aplicar mínimo privilegio.

### Descargas y enlaces

S3 y Athena descargan datos o generan enlaces; Lambda puede descargar y extraer un paquete. Una URL prefirmada concede acceso temporal al objeto, por lo que debe tratarse como información sensible. Las rutas locales y la sobrescritura dependen del diálogo o parámetros del módulo.

## 6. Errores y diagnóstico

Los errores del SDK se convierten a texto y se muestran en el área de contenido. Los mensajes de autenticación —token vencido o inválido y acceso denegado— reciben un panel específico de credenciales.

| Síntoma | Causa probable y acción |
|---|---|
| No aparecen perfiles | Configurar uno en `~/.aws/credentials` o `~/.aws/config`; verificar la sintaxis de secciones y el home del usuario. |
| Lista vacía | Comprobar la insignia de región, cuenta, filtros y permisos IAM de listado/descripción. Si falta la región del perfil, agregarla en `~/.aws/config` en lugar de depender del fallback `us-east-1`. |
| Token vencido o inválido | Renovar SSO o credenciales temporales fuera de la app y volver a elegir el perfil o reiniciar. |
| Acceso denegado | Incorporar sólo las acciones IAM y scopes de recursos necesarios. |
| Falla con emulador | Verificar `endpoint_url`, disponibilidad e implementación de esa API concreta. |
| Estado sin cambios | Actualizar luego de un intervalo; muchas operaciones son asíncronas y eventualmente consistentes. |
| Consulta sin resultados | Revisar catálogo/base, SQL, ubicación de salida, permisos del servicio/workgroup y estado de ejecución. |

## 7. Seguridad

- Las credenciales permanecen en la cadena del SDK y no pasan al frontend JavaScript.
- Recursos, logs, resultados, secretos y credenciales STS pueden mostrarse localmente; se debe proteger el equipo y su pantalla.
- Usar perfiles dedicados de mínimo privilegio; nunca credenciales root.
- Tratar los endpoints personalizados como infraestructura confiable: las solicitudes SDK del perfil pueden redirigirse allí.
- Tratar URLs prefirmadas, artefactos, secretos y tokens de sesión como datos sensibles.
- No existe un modelo de roles propio de la aplicación: la autorización es exactamente la que AWS o el emulador permita al perfil.

## 8. Limitaciones conocidas

- La región se configura mediante `~/.aws/config`, no con un selector interno; si falta se usa `us-east-1` como fallback.
- Cobertura parcial de API por servicio.
- Sin creación de credenciales, login SSO ni renovación dentro de la aplicación.
- Sin vista simultánea de múltiples perfiles o regiones.
- Compatibilidad con emuladores no garantizada; Redshift y Lake Formation muestran advertencia explícita.
- El repositorio actual no incluye pruebas automatizadas.
