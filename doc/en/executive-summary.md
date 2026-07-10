# Executive Summary

## AWS Desktop Center — Desktop Application for AWS Data Services

### Overview

AWS Desktop Center is a lightweight desktop application that provides a visual, Kodi-style interface for managing AWS data services. It enables data engineers, analysts, and DevOps teams to interact with AWS resources through an intuitive graphical interface, eliminating the need to switch between multiple browser tabs or memorize CLI commands.

### Problem Statement

Managing AWS data services typically requires:
- Navigating the AWS Console across multiple tabs and services
- Memorizing AWS CLI commands and their parameters
- Context-switching between different tools for different services

This creates friction in daily workflows, especially for teams managing complex data pipelines across S3, Glue, Athena, DynamoDB, and other services.

### Solution

AWS Desktop Center consolidates 10 AWS data services into a single, fast desktop application with:
- **Unified navigation** — All services accessible from one sidebar
- **Visual exploration** — Tile-based UI for browsing resources
- **Quick actions** — Upload, download, query, invoke, and manage resources directly
- **Credential management** — Reads AWS profiles from local configuration
- **Cross-platform** — Runs on Linux, Windows, and WSL2

### Key Features

![Profile Selection](../../img/AWS%20Data%20Center%20(Ubuntu)%20-start.png)
*Profile selection screen*

![Main Menu](../../img/AWS%20Data%20Center%20(Ubuntu)%20-%20main_menu.png)
*Main menu with service tiles*

| Capability | Description |
|-----------|-------------|
| Multi-service | S3, DynamoDB, RDS, Redshift, Glue, Athena, Lambda, CloudWatch, EventBridge, Lake Formation |
| Lightweight | ~60MB binary, ~30-50MB RAM usage |
| Secure | Credentials never leave the local machine |
| Fast | Instant startup, native performance |
| Portable | Single binary, no installation required |

### Target Users

- Data Engineers managing ETL pipelines (Glue, Athena, S3)
- Database Administrators monitoring RDS/Redshift clusters
- DevOps Engineers managing Lambda functions and event-driven architectures
- Data Analysts running Athena queries and exploring data catalogs
- Platform Teams overseeing Lake Formation governance

### Technology Stack

- **Backend**: Rust + AWS SDK for Rust
- **Frontend**: Vanilla JavaScript (zero framework dependencies)
- **Desktop Framework**: Tauri 2 (native webview, no Chromium bundled)

### Business Value

- **Reduced context-switching** — One app instead of 10+ console tabs
- **Faster operations** — Direct actions without navigating AWS Console
- **Lower resource usage** — Minimal CPU/RAM footprint
- **Security** — No cloud-hosted UI, credentials stay local
- **Accessibility** — Works on Windows (native + WSL2) and Linux

### Current Status

**Version 0.1.0 (POC)** — Functional proof of concept with all 10 services implemented. Ready for internal team evaluation and feedback collection.

### Next Steps

- User feedback and iteration on UI/UX
- Additional service integrations (Step Functions, SQS, SNS)
- Region selector for multi-region environments
- Keyboard navigation (arrow keys + Enter, Kodi-style)
- Auto-refresh for monitoring views
- Syntax highlighting for code viewers
