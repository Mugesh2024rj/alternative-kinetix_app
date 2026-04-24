# KINETIX — Medical Management System

## Full-Stack Application

**Frontend:** React.js + Tailwind CSS + Framer Motion + Recharts  
**Backend:** Node.js + Express.js + PostgreSQL + Socket.io  
**Auth:** JWT + RBAC (Admin, Doctor, Staff)

---

## Modules

1. Authentication (JWT, RBAC)
2. Dashboard (8 metrics, schedule, calendar, activity)
3. Doctors (metrics, table, house visit workflow)
4. Patients (metrics, table, protocol timeline)
5. Appointments (calendar view, status-based actions)
6. Performance (charts, doctor performance index)
7. Handovers (transfer queue, staff availability)
8. Reports (5 types, PDF/CSV/Excel, scheduled)
9. Assessments (metrics, protocol improvement)
10. Settings (clinic, RBAC, schedule, billing, 2FA, sessions)
11. Analytics (weekly/monthly/quarterly, 3 chart types)
12. Events & Outreach (create, assign, post-event report)
13. Notifications (real-time Socket.io, approval workflow)
14. House Visit Workflow (submit → admin approval → stored)

---

## Setup

### 1. PostgreSQL
Create a database named `kinetix_db`:
```sql
CREATE DATABASE kinetix_db;
```

### 2. Backend
```bash
cd backend
# Edit .env — set DB_PASSWORD to your PostgreSQL password
npm install
npm run dev
```
Tables and seed data are created automatically on first run.

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

### 4. Quick Start (Windows)
```
double-click start.bat
```

---

## Default Credentials

| Role   | Username  | Password   |
|--------|-----------|------------|
| Admin  | admin     | admin123   |
| Doctor | dr.smith  | doctor123  |

---

## API Base URL
`http://localhost:5000/api`

## Frontend URL
`http://localhost:3000`
