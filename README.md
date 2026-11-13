# CivicFlow (GovTech Infrastructure SRE)
### Municipal SLA-Driven Civic Infrastructure Lifecycle, Spatial Incident Clustering & Field Dispatch Engine

> **Course**: Full Stack Web Development 2 (FSD-2) &bull; 3rd Year B.E. Computer Science & Engineering  
> **Institution**: Chandigarh University, Gharuan, Mohali, Punjab  
> **Academic Session**: 2026–2027 &bull; Batch: 2024–2028  
> **Technology Stack**: React 18, Vite, Tailwind CSS, Leaflet.js, Node.js, Express.js, MongoDB Atlas (2dsphere Spatial Index)  
> **Deployment Status**: 100% Free Cloud Tier Ready (Vercel + Render + MongoDB Atlas M0)

---

## 🌟 Executive Summary & Innovations

CivicFlow transforms traditional, broken civic grievance portals into an **intelligent geospatial operations engine**. Traditional portals suffer from duplicate ticket flooding, arbitrary triage, and unverified contractor claims. CivicFlow resolves these through four computer science innovations:

1. **50-Meter Geospatial Incident Clustering**: Uses MongoDB's spherical spatial index (`2dsphere`) and `$nearSphere` search to automatically collapse duplicate citizen reports within 50 meters into a single Master Work Order, incrementing citizen upvotes rather than cluttering backlogs.
2. **Dynamic Multi-Factor Priority Scoring**:
   $$\text{PriorityScore} = (w_1 \cdot \text{Severity}) + (w_2 \cdot \log_2(\text{Reports} + 1)) + (w_3 \cdot \text{TrafficIndex}) + (w_4 \cdot \text{AgeDays})$$
   Automatically ranks road cave-ins and water ruptures above minor cosmetic flaws.
3. **Anti-Fraud Geofenced Proof-of-Work Verification**: Field contractors must upload completion photos on-site. The server extracts upload GPS coordinates and validates the Great-Circle distance against the defect location using the **Haversine formula**. Uploads exceeding **35 meters** are automatically rejected with **HTTP 422**, preventing off-site billing fraud.
4. **Autonomous SLA Escalation Watchdog**: An in-process background daemon continuously tracks contract deadlines, issuing 75% elapsed warnings and escalating overdue work orders to Department Chiefs.

---


## 👥 Multi-Role Personas (RBAC) & 1-Click Demo Logins

The application features a built-in **1-Click Role Switcher** in the navigation bar for instant examiner testing:

| Persona | Demo Account Email | Password | Role Responsibilities |
| :--- | :--- | :--- | :--- |
| **Citizen Reporter** | `citizen@civicflow.gov.in` | `password123` | Geotag defect on map, upvote community issues, track live repairs. |
| **Municipal Chief Engineer** | `admin@civicflow.gov.in` | `password123` | Triage spatial clusters, assign contractors, set SLA deadlines, inspect & approve payments. |
| **Field Contractor** | `contractor@civicflow.gov.in` | `password123` | Accept dispatch, arrive on site, upload completion photo with GPS geofence check. |
| **City Governance Auditor** | `auditor@civicflow.gov.in` | `password123` | Ward performance metrics, SLA compliance analytics, contractor fraud audit logs. |

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance OR free MongoDB Atlas URI

### 2. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Run Automated Tests
```bash
cd server
npm test
```
*Executes all 6 mathematical, geofencing, priority scoring, and cryptographic tests.*

### 4. Seed Realistic Spatial Demonstration Data
```bash
cd server
npm run seed
```
*Populates 4 demo users, 5 master defect clusters in the Chandigarh/Mohali Tricity region, 4 work orders, and audit logs.*

### 5. Launch the Application
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd server
npm start
# Server listens on http://localhost:5000 (Health check: http://localhost:5000/api/health)
```

**Terminal 2 (React Frontend):**
```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

Open your browser to `http://localhost:5173`. Use the **Switch Role** dropdown in the navigation header to seamlessly test any workflow!

---

## 🔑 Complete Free API Keys & External Services Setup Guide

CivicFlow is engineered so that **no paid subscriptions or credit cards are required**. Below is the complete breakdown of every API key, where to obtain it for free, and how it is configured:

| Service / Provider | Purpose in Project | Cost | API Key Required? | Where to Obtain (Free Link) |
| :--- | :--- | :--- | :--- | :--- |
| **OpenStreetMap & CartoDB** | High-contrast interactive GIS map tiles & layers | **100% Free** | ❌ **No Key Required** | Built directly into Leaflet; public tile servers are used without registration. |
| **MongoDB Atlas** | Production cloud database with `2dsphere` spatial indexing | **100% Free (Forever)** | ✅ Connection URI | [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (M0 Sandbox, 512MB free) |
| **JWT (JsonWebToken)** | Cryptographic user session authentication & RBAC tokens | **100% Free** | ✅ Secret String | Generated locally with Node.js crypto (`crypto.randomBytes(32).toString('hex')`) |
| **Render.com** | Free backend cloud hosting with automatic SSL & Git continuous deployment | **100% Free** | ❌ Free Tier | [render.com](https://render.com) (Deploy Node.js Web Service) |
| **Vercel** | Free frontend static & CDN deployment with custom `.vercel.app` domains | **100% Free** | ❌ Free Tier | [vercel.com](https://vercel.com) (Deploy Vite/React Client) |
| **Cloudinary (Optional)** | Production cloud photo upload storage for field evidence | **100% Free** | Optional Key | [cloudinary.com](https://cloudinary.com) (25GB free tier / 25 monthly credits) |

### Step-by-Step: Obtaining Your Free MongoDB Atlas URI (5 Minutes)
1. Navigate to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and register with your email or Google account.
2. Under deployment type, select **M0 Free (Shared)**. Pick the closest cloud region (e.g. AWS `ap-south-1` Mumbai).
3. Under **Security &rarr; Database Access**, click **Add New Database User**:
   - Authentication Method: Password
   - Username: `civicflow_admin`
   - Password: `YourSecurePassword123`
4. Under **Security &rarr; Network Access**, click **Add IP Address**:
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) &rarr; Confirm.
5. Under **Deployments &rarr; Database &rarr; Connect**:
   - Choose **Drivers (Node.js)**.
   - Copy your connection string:
     ```
     mongodb+srv://civicflow_admin:YourSecurePassword123@cluster0.mongodb.net/civicflow?retryWrites=true&w=majority
     ```
6. Set this string as `MONGO_URI` in your server `.env` or Render environment settings.

---

Follow these steps to host CivicFlow online for free and generate a public live link for your submission:

### Step 1: Free Database on MongoDB Atlas
1. Register at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create an **M0 Free Shared Cluster** in region `ap-south-1` (Mumbai).
3. Under **Database Access**, create a user (e.g. `civicuser`) and password.
4. Under **Network Access**, click **Add IP Address** $\to$ select **Allow Access from Anywhere (`0.0.0.0/0`)**.
5. Copy your connection string:
   ```
   mongodb+srv://civicuser:<password>@cluster0.mongodb.net/civicflow?retryWrites=true&w=majority
   ```

### Step 2: Free Backend on Render.com
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) using GitHub.
3. Click **New +** $\to$ **Web Service** $\to$ connect your repo.
4. Set parameters:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `MONGO_URI`: *(your MongoDB Atlas URI)*
   - `JWT_SECRET`: `civicflow_super_secret_jwt_key_2026_cse`
   - `NODE_ENV`: `production`
6. Click **Deploy Web Service**. You will receive a URL like:
   `https://civicflow-api.onrender.com`

### Step 3: Free Frontend on Vercel
1. Sign in to [Vercel](https://vercel.com) using GitHub.
2. Click **Add New...** $\to$ **Project** $\to$ import your repo.
3. Set parameters:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://civicflow-api.onrender.com/api`
5. Click **Deploy**. Vercel will build and assign your free live URL:
   `https://civicflow.vercel.app`

---

## 📁 Repository Directory Structure

```
fsd2 project/
├── PROJECT_REPORT.md             # Formal 34-page Academic Report (IEEE/University Format)
├── README.md                     # Comprehensive Setup & Free Hosting Documentation
├── package.json                  # Root orchestration scripts
├── server/
│   ├── package.json              # Express, Mongoose, Bcryptjs, JWT, Multer
│   ├── index.js                  # Express server & API routes mount
│   ├── config/
│   │   └── db.js                 # MongoDB Atlas connection handler
│   ├── models/
│   │   ├── User.js               # User accounts & RBAC roles
│   │   ├── Incident.js           # 2dsphere GeoJSON spatial tickets & clusters
│   │   ├── WorkOrder.js          # SLA deadlines, geofence logs, contractor stages
│   │   └── AuditLog.js           # Immutable system event logs
│   ├── routes/
│   │   ├── auth.js               # Register, Login, Me, Demo accounts
│   │   ├── incidents.js          # GeoJSON submit, 50m cluster, subscribe, query
│   │   ├── workOrders.js         # Dispatch, accept, complete with geofence, approve
│   │   └── analytics.js          # Ward health metrics, SLA stats, audit logs
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & role authorization
│   │   └── upload.js             # Multer image upload processing
│   ├── utils/
│   │   ├── geoCluster.js         # Haversine distance, geofence, 50m clustering
│   │   ├── priorityScorer.js     # Multi-factor dynamic priority calculation
│   │   └── slaDaemon.js          # Autonomous background SLA watchdog
│   ├── seed/
│   │   └── seedData.js           # Seed data for Tricity (Chandigarh/Mohali)
│   └── tests/
│       └── api.test.js           # Automated test suite (6/6 passing)
└── client/
    ├── package.json              # React 18, Vite, Tailwind CSS, Leaflet, Recharts
    ├── vite.config.js            # Vite build configuration & proxy
    ├── index.html                # App entry shell with Leaflet styles
    ├── tailwind.config.js        # Custom palette & styling tokens
    └── src/
        ├── App.jsx               # Routes, role-protected routes, footer
        ├── main.jsx              # Application DOM root
        ├── api.js                # Centralized Axios client & interceptor
        ├── context/
        │   └── AuthContext.jsx   # Authentication context & demo logins
        ├── components/
        │   ├── Navbar.jsx        # Role switcher, brand banner, navigation
        │   ├── LeafletMap.jsx    # Interactive map, colored pins, radius rings
        │   ├── IncidentCard.jsx  # Defect card with priority score & cluster info
        │   └── BeforeAfterSlider.jsx # Visual repair comparison slider
        └── pages/
            ├── Home.jsx          # Hero section, live counters, repair spotlight
            ├── ReportIncident.jsx# Pin on map, severity slider, cluster feedback
            ├── IncidentExplorer.jsx # Map + list filtering by ward, category, status
            ├── AdminCommand.jsx  # Municipal command center, dispatch, inspection
            ├── ContractorPortal.jsx # Field contractor portal with GPS geofence test
            ├── Analytics.jsx     # Ward charts, SLA compliance, audit logs
            └── AuthPage.jsx      # Authentication & 1-click demo accounts
```

---

## 📜 Academic Attribution & License

Built as the Major Capstone Project for **Full Stack Web Development 2 (FSD-2)** in the Department of Computer Science & Engineering, Chandigarh University. Released under the MIT License.
