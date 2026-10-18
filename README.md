# Enterprise Service Status & Health Monitoring Platform

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.7.18-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1.svg)](https://www.mysql.com/)

A modern, resilient, enterprise-grade uptime monitoring and status platform designed for mission-critical infrastructure, academic portals, and web services.

---

## 🌟 Key Features & Probing Capabilities

### 1. Advanced Content Verification & Error Catching
Many monitoring systems only check the HTTP status code (e.g. `200 OK`). In modern architectures, CDNs (Cloudflare), WAFs, and reverse proxies (Nginx/Apache) often return `200 OK` while serving an internal error page. This platform utilizes an intelligent `ContentVerifier` engine:

- **Disguised HTTP Errors (Embedded in 200 OK)**:
  - Catches `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, and `504 Gateway Timeout` inside the HTML body.
  - Detects `X-Cache-Status: STALE` when reverse proxies serve stale cache because the backend origin is down.
- **Cloudflare Challenge & DDoS Pages**:
  - Automatically identifies Cloudflare verification/challenge pages (`cf-browser-verification`, `challenge-platform`), alerting operators that real users are blocked by firewall challenges.
- **Maintenance Page Detection**:
  - Catches scheduled maintenance notices (`đang bảo trì`, `đang nâng cấp`, `under maintenance`, `temporarily down for maintenance`) and marks status accordingly.
- **Undeployed / Default Server Pages**:
  - Detects default server splash pages (`Welcome to nginx!`, `Apache2 Ubuntu Default Page`, `It works!`), preventing false positives when a server is running but the actual web application is not deployed.
- **JSON API Error Body Parsing**:
  - For microservices and REST APIs, checks if the response body contains `{"error": ...}` or embedded error codes even when HTTP transport succeeds.
- **Empty Body & Minimal Content Detection**:
  - Catches white-screen-of-death (WSOD) issues where a page returns 200 with less than 10 characters of visible text.

---

### 2. Deep Validation Options: XPath, CSS Selector & Keywords

| Option | Method | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **HTTP Code** | Header inspection | `200`, `301`, `302` | Validates target response code; handles redirect chains without losing cookies. |
| **Keyword Check** | Substring search | `Cổng thông tin đào tạo` | Ensures the page contains critical textual identifiers. |
| **CSS Selector** | Jsoup DOM query | `#login-form`, `.main-container` | Verifies the physical presence of crucial HTML components. |
| **XPath Check** | XPath evaluation | `//form[@class='login-box']` | Strict hierarchical verification of nested elements or forms. |
| **Login Verify** | Security string check | `auth_token_csrf` | Verifies login forms and CSRF tokens are rendered properly. |

---

### 3. Intelligent Scheduling & Round-Robin Rotation

The `CheckScheduler` and `HealthCheckService` implement an adaptive, resource-conscious rotation model:

- **Priority-Based Dynamic Probing**:
  - **OFFLINE Services**: Checked aggressively every **30 seconds** for rapid recovery detection (`Fast Recovery Detection`).
  - **ONLINE Services**: Checked on their configured cycle (default **60 seconds**, configurable up to **86400s**), drastically reducing CPU and outbound bandwidth load.
- **Staggered Batch Execution (Anti-Congestion)**:
  - Probes are batched in groups of 6 with 3-second spacing between batches. This prevents NIC congestion and prevents WAFs/firewalls from blacklisting the monitoring IP due to request flooding.
- **Smart Timeout Escalation**:
  - Probes escalate progressively: `5s` → `10s` → `maxTimeout`. If a node is completely unresponsive, threads are released quickly rather than hanging the thread pool.
- **Rate-Limiting Semaphore & Thread Pool**:
  - Concurrent outbound probes are throttled via an OS-level Semaphore to prevent socket exhaustion.
- **Server-Sent Events (SSE) Push**:
  - State changes and latency metrics are pushed to the frontend in real time via `/sse`, eliminating browser polling.

---

### 4. SSL/TLS Certificate Intelligence

- **Daily Automatic Scan**: Checks expiration date, issuer, and validation chain every 24 hours.
- **Expiring Escalation**: When a certificate enters the 15-day expiration window, checks escalate to **every 5 minutes**.
- **Renewal Detection**: Automatically detects when a renewed certificate is deployed, clears previous alerts, and sends a Telegram confirmation.

---

### 5. SOC & Admin Dashboard Configuration

The dashboard provides granular control per service:
- **Timeout (Seconds)**: Maximum connection deadline (1 - 60s).
- **Failure Threshold (Retries)**: Number of consecutive failed checks before switching status to `OFFLINE` and triggering alerts.
- **Check Interval (Seconds)**: Custom scheduling interval per target.
- **Ignore SSL**: Bypass SSL validation for self-signed certificates or test nodes.
- **Check Method Toggles**: Easily toggle `useKeyword`, `useSelector`, `useXpath`, and `useLoginVerify`.

---

## 🏗️ Architecture

```
                          [ Client Browsers / Public Users ]
                                         │
                                   (HTTPS :443)
                                         ▼
                      [ Reverse Proxy (Nginx / Apache) ]
                                  │             │
                    Proxy Pass /  │             │ Proxy Pass /api & /sse
                                  ▼             ▼
             [ React + Vite Frontend (:5173) ]   [ Spring Boot Backend (:8082) ]
                                                        │
                                                        ▼
                                             [ MySQL 8.0 Database ]
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Java JDK 11** or higher
- **Node.js 18+** & **npm**
- **MySQL 8.0+**
- **PM2** (Recommended for production)

---

### 2. Database Migration

```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE vnu_status CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# 2. Import clean skeleton schema
mysql -u root -p vnu_status < db/schema.sql
```

> [!IMPORTANT]
> **Default Administrator Credentials**:
> - **Username**: `admin`
> - **Password**: `admin`
>
> Change your password in the Admin dashboard immediately upon first login!

---

### 3. Environment & Configuration

```bash
cp .env.example .env
cp backend/src/main/resources/application.properties.example backend/src/main/resources/application.properties
```

---

### 4. Build & Run Locally

#### Backend (Spring Boot):
```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/vnu-status-2026.1.0.jar
```

#### Frontend (React + Vite):
```bash
cd ../frontend
npm install
npm run build
npx serve -s dist -l 5173
```

---

### 5. Production Deployment (PM2)

```bash
cp ecosystem.config.js.example ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

---

## 🛡️ Security & Privacy Notice
This repository contains zero proprietary data, real private keys, internal tokens, or production passwords. All sensitive parameters are isolated via environment variables.
