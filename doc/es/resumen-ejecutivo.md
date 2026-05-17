# Resumen Ejecutivo

## AWS Data Center — Aplicación de Escritorio para Servicios de Datos en AWS

### Descripción General

AWS Data Center es una aplicación de escritorio liviana que proporciona una interfaz visual estilo Kodi para gestionar servicios de datos en AWS. Permite a ingenieros de datos, analistas y equipos DevOps interactuar con recursos de AWS a través de una interfaz gráfica intuitiva, eliminando la necesidad de alternar entre múltiples pestañas del navegador o memorizar comandos CLI.

### Problema

Gestionar servicios de datos en AWS típicamente requiere:
- Navegar la consola de AWS entre múltiples pestañas y servicios
- Memorizar comandos de AWS CLI y sus parámetros
- Cambiar constantemente de contexto entre diferentes herramientas

Esto genera fricción en los flujos de trabajo diarios, especialmente para equipos que gestionan pipelines de datos complejos entre S3, Glue, Athena, DynamoDB y otros servicios.

### Solución

AWS Data Center consolida 10 servicios de datos de AWS en una única aplicación de escritorio rápida con:
- **Navegación unificada** — Todos los servicios accesibles desde un sidebar
- **Exploración visual** — UI basada en tiles para navegar recursos
- **Acciones rápidas** — Upload, download, query, invoke y gestión directa de recursos
- **Gestión de credenciales** — Lee perfiles AWS de la configuración local
- **Multiplataforma** — Funciona en Linux, Windows y WSL2

### Características Principales

![Selección de Perfil](../../img/AWS%20Data%20Center%20(Ubuntu)%20-start.png)
*Pantalla de selección de perfil*

![Menú Principal](../../img/AWS%20Data%20Center%20(Ubuntu)%20-%20main_menu.png)
*Menú principal con tiles de servicios*

| Capacidad | Descripción |
|-----------|-------------|
| Multi-servicio | S3, DynamoDB, RDS, Redshift, Glue, Athena, Lambda, CloudWatch, EventBridge, Lake Formation |
| Liviana | Binario de ~60MB, ~30-50MB de uso de RAM |
| Segura | Las credenciales nunca salen de la máquina local |
| Rápida | Inicio instantáneo, rendimiento nativo |
| Portable | Un solo binario, no requiere instalación |

### Usuarios Objetivo

- Ingenieros de Datos gestionando pipelines ETL (Glue, Athena, S3)
- Administradores de Bases de Datos monitoreando clusters RDS/Redshift
- Ingenieros DevOps gestionando funciones Lambda y arquitecturas event-driven
- Analistas de Datos ejecutando queries en Athena y explorando catálogos de datos
- Equipos de Plataforma supervisando la gobernanza con Lake Formation

### Stack Tecnológico

- **Backend**: Rust + AWS SDK for Rust
- **Frontend**: Vanilla JavaScript (cero dependencias de frameworks)
- **Framework de escritorio**: Tauri 2 (webview nativo, sin Chromium embebido)

### Valor de Negocio

- **Menos cambio de contexto** — Una app en lugar de 10+ pestañas de consola
- **Operaciones más rápidas** — Acciones directas sin navegar la consola AWS
- **Menor uso de recursos** — Mínimo consumo de CPU/RAM
- **Seguridad** — Sin UI en la nube, credenciales permanecen locales
- **Accesibilidad** — Funciona en Windows (nativo + WSL2) y Linux

### Estado Actual

**Versión 0.1.0 (POC)** — Prueba de concepto funcional con los 10 servicios implementados. Lista para evaluación interna del equipo y recolección de feedback.

### Próximos Pasos

- Feedback de usuarios e iteración sobre UI/UX
- Integraciones adicionales (Step Functions, SQS, SNS)
- Selector de región para entornos multi-región
- Navegación por teclado (flechas + Enter, estilo Kodi)
- Auto-refresh para vistas de monitoreo
- Syntax highlighting para visualización de código
