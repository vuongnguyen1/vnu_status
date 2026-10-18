# Enterprise Service Status & Health Monitoring Platform

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.7.18-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1.svg)](https://www.mysql.com/)

A modern, resilient, enterprise-grade uptime monitoring and status platform designed for mission-critical infrastructure, academic portals, and web services.

---

## 🌟 Key Features

- **Continuous Health Checks**:
  - Multi-threaded HTTP/HTTPS/TCP health probe engine with configurable intervals (30s, 60s, 300s).
  - Advanced response code evaluation, latency calculation, and DNS/SSL handshake measurement.
  - Automated detection of degraded, outage, or recovering states.

- **Automated SSL/TLS Certificate Management**:
  - Background scheduler automatically scans SSL validity, issuer details, and expiration dates.
  - Proactive warning notifications before certificates expire (customizable threshold, default 14 days).

- **Modern Interactive Dashboard**:
  - Live service status cards grouped by category (`General`, `Student`, `Staff`, `Internal`).
  - Historical 90-day SLA availability bars with millisecond latency graphs.
  - Real-time Server-Sent Events (SSE) updates without requiring browser refreshes.

- **Security Operations Center (SOC) View**:
  - Dedicated NOC/SOC dashboard (`/soc`) for real-time operations and triage.
  - Quick-scan triggers and immediate visual alerts for failing services.

- **Administrative Management Portal**:
  - Secure JWT authentication with role-based access control.
  - Add, edit, test, and remove monitored targets with customized timeout and validation strings.
  - Real-time audit logs and diagnostic trace inspection.

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
- **PM2** (Recommended for production daemon management)

---

### 2. Database Migration

Create the database and import the clean skeleton schema:

```bash
# 1. Log in to MySQL and create the database
mysql -u root -p -e "CREATE DATABASE vnu_status CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

# 2. Import the clean migration schema
mysql -u root -p vnu_status < db/schema.sql
```

> [!IMPORTANT]
> **Default Administrator Credentials**:
> - **Username**: `admin`
> - **Password**: `admin`
>
> Please change this password in the Admin dashboard immediately after your first login!

---

### 3. Environment & Configuration

Copy the example configuration:
```bash
cp .env.example .env
cp backend/src/main/resources/application.properties.example backend/src/main/resources/application.properties
```

Edit `backend/src/main/resources/application.properties` or provide environment variables:
| Parameter | Default | Description |
| :--- | :--- | :--- |
| `SERVER_PORT` | `8082` | Backend Spring Boot port |
| `DB_HOST` | `127.0.0.1` | MySQL Database Host |
| `DB_PORT` | `3306` | MySQL Database Port |
| `DB_NAME` | `vnu_status` | Database Name |
| `DB_USER` | `vnu_status` | Database User |
| `DB_PASSWORD` | `vnu_status` | Database Password |
| `TELEGRAM_BOT_TOKEN` | *(Optional)* | Telegram Bot Token for Failure Alerts |
| `TELEGRAM_CHAT_ID` | *(Optional)* | Telegram Channel / Group ID |

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

Use the pre-configured PM2 ecosystem configuration:
```bash
cp ecosystem.config.js.example ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

Configure your domain name in `apache.conf.example` and link it to your web server.

---

## 🛡️ Security & Privacy Notice
This repository contains zero proprietary data, real private keys, internal tokens, or production passwords. All sensitive parameters are isolated via environment variables.
