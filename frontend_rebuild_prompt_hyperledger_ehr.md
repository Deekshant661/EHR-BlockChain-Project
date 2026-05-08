# Hyperledger EHR Frontend Rebuild Prompt

Act as a Senior Full-Stack Frontend Architect specializing in secure healthcare systems.

We are rebuilding the frontend for an existing Hyperledger Fabric + Node.js Electronic Health Record (EHR) system.

IMPORTANT:
The old frontend is completely outdated and no longer matches the backend architecture.
Completely SCRAP the existing frontend and rebuild the frontend from scratch.

Do NOT patch or reuse old HTML/CSS logic.
Do NOT redesign backend APIs.
The frontend must adapt to the existing backend architecture.

---

# Existing Backend Architecture

The backend is already production-oriented and fully functional.

Current backend stack:
- Node.js
- Express.js
- Hyperledger Fabric
- SQLite authentication layer
- JWT authentication
- Role-based access control (RBAC)
- Fabric CA identity enrollment
- Chaincode-based patient consent system

The backend already supports:
- JWT authentication
- Email/password login
- Role-based middleware
- Patient-controlled access granting/revoking
- Fabric chaincode transactions
- Protected APIs
- SQLite user management

DO NOT create fake APIs.
DO NOT invent new backend endpoints.
Frontend must consume the existing APIs only.

---

# Required Frontend Stack

Use:
- React
- TailwindCSS
- Axios
- React Router DOM
- Context API

Do NOT use:
- Redux
- Material UI
- Chakra UI
- Firebase
- Next.js
- TypeScript

Use modern React functional components and hooks only.

---

# Frontend Goals

Build a modern, responsive, production-style healthcare dashboard application.

The frontend should:
- look professional
- support JWT authentication
- support role-based dashboards
- automatically manage authentication tokens
- protect frontend routes
- consume the real backend APIs
- handle loading/error states cleanly
- support blockchain healthcare workflows

---

# Required Pages

## Public Pages

### 1. Landing Page
Features:
- project introduction
- healthcare/blockchain theme
- login button
- signup button
- responsive design
- hero section
- architecture/features section

---

### 2. Login Page
Fields:
- email
- password

Features:
- JWT login
- validation
- loading state
- invalid credential handling
- redirect based on role after login
- store JWT automatically

Backend endpoint:
POST /api/auth/login

---

### 3. Signup Page
Fields:
- full name
- email
- password
- role dropdown

Allowed signup roles:
- patient
- doctor
- insuranceAgent

Do NOT allow:
- hospitalAdmin
- insuranceAdmin

Features:
- validation
- loading state
- success/error handling
- auto-login after signup

Backend endpoint:
POST /api/auth/signup

---

# Protected Pages

## 4. Patient Dashboard
Features:
- view own profile
- view medical records
- view insurance claims
- grant doctor access
- revoke doctor access
- create insurance claims
- logout

Sections:
- patient info card
- authorized doctors list
- records table
- claims table

Use JWT token automatically.

---

## 5. Doctor Dashboard
Features:
- search/view patient by blockchain ID
- add medical records
- view authorized patient records
- query patient history
- logout

Sections:
- patient search
- add record form
- patient records table
- history/audit section

---

## 6. Insurance Dashboard
Features:
- view claims
- approve claims
- view patient policies
- logout


---

## 7. Hospital Admin Dashboard

Route:
/admin/dashboard

Role:
- hospitalAdmin

IMPORTANT:
Keep this dashboard lightweight and operational-focused.
Do NOT overload it with unnecessary enterprise complexity.

Features:

- Staff Directory
  - fetch and display enrolled doctors
  - use existing endpoints such as POST /api/ehr/getAllPatients or a dedicated user endpoint if available

- System Logs / Ledger Monitoring
  - simple blockchain activity overview
  - recent transactions list
  - recent medical record activity
  - ledger/network health indicators

Suggested UI:

- overview metric cards
- recent transactions table
- doctor directory table

---

## 8. Insurance Admin Dashboard

Route:
/insurance-admin/dashboard

Role:
- insuranceAdmin

IMPORTANT:
Keep this dashboard lightweight and oversight-oriented.
Focus on visibility and governance rather than complex analytics.

Features:

- Policy Overview
  - display active insurance policies across the network

- Agent Directory
  - display all registered insuranceAgent identities

- Claims Audit
  - total claims processed
  - approved claims
  - rejected claims
  - pending claims metrics

Suggested UI:

- analytics summary cards
- claims overview table
- insurance agent directory table
- policy overview section
---

# Authentication Requirements

Implement complete JWT authentication flow.

Frontend must:
- store JWT token automatically
- attach Bearer token automatically to every protected API request
- redirect unauthenticated users to login
- persist login sessions after refresh
- clear auth state on logout

Use:
- Context API
- ProtectedRoute component
- Axios interceptors

---

# Role-Based Routing

Implement frontend route protection.

Examples:
- patient routes accessible only to patients
- doctor routes accessible only to doctors
- insurance routes accessible only to insurance roles

Unauthorized users should be redirected.

---

# API Integration Rules

Frontend must integrate with the REAL backend APIs.

Do NOT:
- mock APIs
- fake responses
- hardcode data
- redesign backend routes

Use Axios for all API requests.

Create:
/services/api.js

with:
- Axios instance
- base URL config
- JWT interceptor
- centralized error handling

---

# UI/UX Requirements

Design should look modern and professional.

Theme:
- healthcare + cybersecurity aesthetic
- modern purple-accented UI theme
- use shades of purple/violet for the primary background and accents
- dark/light contrast
- clean dashboard cards
- responsive layouts
- professional typography

Use:
- Tailwind utility classes
- responsive grid layouts
- cards/tables/forms
- loading spinners
- toast notifications

Avoid:
- excessive animations
- childish design
- cluttered layouts

---

# Project Structure

Create clean frontend architecture:

/src
  /components
  /pages
  /layouts
  /context
  /services
  /routes
  /utils
  /styles

Important files:
- AuthContext.jsx
- ProtectedRoute.jsx
- api.js
- App.jsx
- router configuration

---

# State Management

Use Context API only.

AuthContext should manage:
- current user
- token
- login/logout
- role
- session persistence

---

# Error Handling

Implement proper frontend error handling.

Examples:
- invalid login
- unauthorized access
- expired JWT
- failed blockchain transactions
- network errors

Show user-friendly messages.

Do NOT expose raw Fabric errors directly to users.

---

# Backend Compatibility Constraints

Maintain compatibility with:
- existing JWT backend
- existing role middleware
- existing Hyperledger Fabric APIs
- existing SQLite auth system
- existing chaincode transactions

Do NOT modify backend architecture.
Do NOT change backend API contracts.

---

# Deliverables

Generate:
- complete React frontend
- all pages
- all routing
- authentication flow
- Axios integration
- protected routes
- responsive dashboards
- Tailwind styling
- reusable components

The application should be runnable immediately after:

npm install
npm run dev

---

# Development Strategy

Before generating code:
1. Show proposed frontend architecture
2. Show folder structure
3. Explain auth flow
4. Explain role routing strategy
5. Explain JWT storage strategy
6. Explain API integration approach

Then generate the implementation.

Do NOT generate placeholder-only pages.
Build functional healthcare dashboards integrated with the real backend.

