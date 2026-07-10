# Documentación Funcional

## AWS Desktop Center — Guía de Usuario

### Inicio Rápido

1. Ejecutar la aplicación (`./aws-desktop-center` en Linux o `aws-desktop-center.exe` en Windows)
2. Seleccionar un perfil AWS de la lista (se leen de `~/.aws/credentials` y `~/.aws/config`)
3. Navegar los servicios usando el sidebar o el grid de tiles en la pantalla principal

### Módulos de Servicio

---

## S3 — Almacenamiento de Objetos

**Vista principal**: Muestra todos los buckets S3 con barra de filtro.

**Vista de bucket**: Navegar carpetas y archivos dentro de un bucket.

**Acciones sobre objetos**:
- **Info** — Ver detalles: tamaño, última modificación, content type, ETag, storage class, metadata, tags
- **Download** — Descargar objeto a un path local
- **Copy** — Copiar o mover objeto a otro bucket/key
- **Delete** — Eliminar objeto (con confirmación)
- **Generate Link** — Crear URL pre-firmada (1 hora de expiración)

**Búsqueda**: Buscar objetos por nombre dentro de un bucket (busca en todos los prefijos).

**Upload**: Subir un archivo local al prefijo actual.

---

## DynamoDB — Base de Datos NoSQL

**Vista principal**: Lista todas las tablas con filtro.

**Detalle de tabla**:
- Info: status, cantidad de items, tamaño, billing mode, fecha de creación
- Keys: partition key, sort key, GSI, LSI
- **Tab Scan**: Escanear hasta 50 items
- **Tab Query**: Consultar por valor de partition key (y opcionalmente prefijo de sort key)
- **Ver item**: Click en "View" en cualquier fila para ver todos los atributos en panel lateral

---

## RDS — Servicio de Base de Datos Relacional

**Vista principal**: Lista clusters e instancias con filtro. Estado con código de color.

**Detalle de instancia**:
- Configuración: engine, versión, clase, multi-AZ, zona de disponibilidad
- Conexión: endpoint, puerto, VPC
- Storage: GB asignados, tipo, retención de backups
- Snapshots: lista de snapshots disponibles
- Acciones: Start/Stop instancia (con confirmación)

**Detalle de cluster**:
- Configuración: engine, versión, multi-AZ, encriptado, retención de backups
- Endpoints: writer y reader, puerto
- Miembros: lista de instancias con rol writer/reader

---

## Redshift — Data Warehouse

**Vista principal**: Lista clusters con filtro.

**Detalle de cluster**:
- Info: tipo de nodo, cantidad de nodos, versión, AZ, encriptado, fecha de creación
- Conexión: endpoint, puerto, database, usuario master, VPC
- **Tab Query Editor**: Ejecutar SQL via Redshift Data API con polling de resultados
- **Tab Tables**: Listar schemas/tablas del catálogo con filtro
- **Tab Snapshots**: Listar snapshots del cluster

---

## Glue — Servicio ETL

**Tabs**: Databases | Jobs | Crawlers | Triggers

**Databases**:
- Lista con filtro, click para ver tablas
- Detalle de tabla: columnas (nombre, tipo, comentario), partition keys, location, formato, SerDe

**Jobs**:
- Lista con filtro, click para detalle
- Detalle: tipo, versión Glue, versión Python, workers, timeout, retries, ubicación del script
- Parámetros: tabla con todos los argumentos por defecto
- **Ver código fuente**: Descarga y muestra el script del job desde S3
- **Descargar**: Guardar script en path local
- **Start Job**: Ejecutar con confirmación
- **Tab Job Runs**: Historial con status, duración, errores

**Crawlers**:
- Lista con filtro, click para detalle
- Detalle: estado, database, schedule, targets, info del último crawl
- **Start Crawler**: Ejecutar con confirmación

**Triggers**:
- Lista con filtro, estado con código de color (verde=activado, rojo=desactivado)
- Detalle: tipo, estado, schedule, jobs asociados
- **Activar/Desactivar**: Toggle del estado con confirmación

---

## Athena — Servicio de Consultas

**Tabs**: Query Editor | History | Saved Queries

**Query Editor**:
- Selector de database (cargado del catálogo Glue)
- Selector de output location (auto-poblado con buckets S3 que contengan "athena")
- **Show Tables**: Panel lateral con tablas del database seleccionado (click genera SELECT automático)
- Editor SQL con ejecución y polling de resultados
- Resultados en tabla (limitado a ~200 filas para visualización)
- **Download Full CSV**: Descargar resultado completo desde S3
- **Generate Link**: URL pre-firmada al CSV (1 hora de expiración)

**History**:
- Tabla con query, database, status, duración, datos escaneados, fecha
- Barra de filtro
- **Reuse**: Cargar query de vuelta en el editor

**Saved Queries**:
- Lista de named queries guardadas en Athena
- Click para cargar en el editor

---

## Lambda — Funciones Serverless

**Vista principal**: Lista todas las funciones (paginadas) con filtro.

**Detalle de función**:
- Configuración: runtime, handler, memoria, timeout, tamaño de código, arquitectura, última modificación
- Role: ARN del rol IAM
- Layers: lista de layers asociadas
- Variables de entorno: tabla con todas las env vars

**Tabs**:
- **Invoke**: Editor de payload JSON + botón invoke. Muestra status code, error y respuesta
- **Recent Logs**: Últimos eventos de log desde CloudWatch
- **Code**: Descarga y muestra el código fuente (extraído del .zip de deployment)

---

## CloudWatch — Monitoreo y Logs

**Tabs**: Alarms | Log Groups | Metrics

**Alarms**:
- Lista con filtro, estado con código de color (verde=OK, rojo=ALARM, naranja=INSUFFICIENT_DATA)
- Detalle: métrica, namespace, comparación, threshold, período, períodos de evaluación, razón del estado, acciones

**Log Groups**:
- Lista con filtro (todos los grupos, paginados)
- Click para ver streams
- **Búsqueda**: Buscar por filter pattern en la última hora
- **Streams**: Click para ver eventos de log con timestamps

**Metrics**:
- Input de namespace (ej: AWS/Lambda, AWS/RDS)
- Tabla con nombre de métrica, namespace, dimensiones
- Barra de filtro

---

## EventBridge — Bus de Eventos

**Vista principal**: Lista event buses con filtro.

**Vista de bus**:
- Lista reglas con filtro, estado con código de color
- **Send Test Event**: Enviar un evento personalizado al bus

**Detalle de regla**:
- Configuración: estado, bus, schedule, descripción
- Targets: lista con ID, ARN, input
- Event Pattern: JSON formateado
- **Enable/Disable Rule**: Toggle con confirmación

---

## Lake Formation — Gobernanza de Datos

**Tabs**: Settings | Databases | Permissions | Registered Locations | LF-Tags | Tag Permissions

**Settings**: Admins del data lake, permisos por defecto para creación de databases/tablas.

**Databases**: Lista del catálogo Glue con filtro. Click para ver tablas.

**Permissions**: Tabla con principal, recurso, permisos, opciones de grant. Filtrable.

**Registered Locations**: Ubicaciones S3 registradas con sus roles IAM.

**LF-Tags**: Tags definidos con sus valores posibles.

**Tag Permissions**: Permisos asociados a LF-Tags (control de acceso basado en tags).

---

### Manejo de Errores

- Si las credenciales AWS expiran, la app muestra un mensaje claro indicando que deben renovarse
- Todos los errores muestran el detalle original de AWS para facilitar el diagnóstico

### Seguridad

- Las credenciales se leen únicamente del archivo local `~/.aws/credentials`
- No se envían datos a servidores externos
- Las URLs pre-firmadas se generan localmente usando el AWS SDK
