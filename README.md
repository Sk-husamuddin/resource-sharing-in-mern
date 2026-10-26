# Resource Sharing & Lost and Found Hub — MERN Stack

A modern, full-stack MERN application migrated from static HTML/CSS into a fully functional, locally running web application with cookie-based server sessions, role-based authorization, complete CRUD workflows, and administrative moderation.

---

## 📁 Project Architecture

```
resource sharing in mern/
├── client/                     # Vite + React Frontend
│   ├── public/                 # Static assets (icons, background)
│   ├── src/
│   │   ├── components/         # Header, Sidebar, ProtectedRoute
│   │   ├── context/            # AuthContext (session state)
│   │   ├── pages/              # Welcome, Login, Signup, Dashboard,
│   │   │                       # ResourceList, ResourceDetail, ResourceForm,
│   │   │                       # LostFound, LostFoundDetail, LostFoundForm,
│   │   │                       # ClaimItem, Claims, Messages, ContactOwner,
│   │   │                       # Profile, Admin
│   │   ├── services/           # Axios API service client
│   │   ├── App.jsx             # React Router route registry
│   │   ├── index.css           # Global layout & component styles
│   │   └── main.jsx            # Application bootstrap
│   ├── index.html              # Vite HTML entry point
│   ├── package.json
│   └── vite.config.js          # Port 5173 + /api reverse proxy
│
├── server/                     # Express + MongoDB Backend
│   ├── src/
│   │   ├── config/             # DB & session configuration
│   │   ├── controllers/        # Auth, Resource, LostFound, Message, Admin
│   │   ├── middleware/         # Auth, validation, error handler
│   │   ├── models/             # User, Resource, LostFoundItem, Claim, Message
│   │   ├── routes/             # REST API routers
│   │   ├── utils/              # make-admin.js, seed.js
│   │   ├── validators/         # express-validator schemas
│   │   ├── app.js              # Express app setup & middleware
│   │   └── server.js           # Entry point (port 5000)
│   ├── tests/                  # Automated integration tests
│   ├── .env.example            # Environment template
│   └── package.json
│
├── docs/                       # Project documentation
├── .gitignore
├── package.json                # Root package manager & concurrently scripts
└── README.md
```

---

## 🛠️ Prerequisites

1. **Node.js** (v18.x or v20.x recommended) and **npm**
2. **MongoDB Community Server** installed and running locally on port `27017`
3. **MongoDB Compass** (optional GUI) connected to `mongodb://127.0.0.1:27017` to inspect databases:
   - `resource_hub` (development database)
   - `resource_hub_test` (automated test database)

---

## 🚀 Getting Started

### 1. Install All Dependencies

From inside the `resource sharing in mern` folder:

```bash
npm run install:all
```

This installs root dependencies (`concurrently`), client dependencies (`react`, `react-router-dom`, `axios`, `vite`), and server dependencies (`express`, `mongoose`, `express-session`, `connect-mongo`, `bcrypt`, etc.).

### 2. Environment Configuration

The backend contains a `.env` file pre-configured for local development. You can inspect or modify `server/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/resource_hub
SESSION_SECRET=local_dev_secret_change_in_production_32chars_minimum
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
SESSION_MAX_AGE=604800000
TEST_MONGO_URI=mongodb://127.0.0.1:27017/resource_hub_test
```

### 3. Run the Full Application

To run both backend and frontend together:

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

Alternatively, run them in separate terminals:
- Backend: `npm run server`
- Frontend: `npm run client`

---

## 🛡️ Admin Account Promotion

In accordance with security requirements, registered users default to the `user` role. To safely promote a local account to an administrator without hardcoded credentials:

1. Register a user in the web application at [http://localhost:5173/signup](http://localhost:5173/signup).
2. Open terminal in `resource sharing in mern/server`:
   ```bash
   node src/utils/make-admin.js <your-registered-email>
   ```
3. Refresh the web app. The sidebar will display the 🛡️ **Admin** panel with full user management, metrics, claims review, and moderation controls.

---

## 🧪 Optional Sample Data Seeding

To populate sample resources and lost/found reports for testing:

```bash
cd server
node src/utils/seed.js
```

---

## 🧪 Running Automated Tests

Integration tests run against an isolated test database (`resource_hub_test`) so your development data is never altered:

```bash
npm run test:server
```

---

## 🌐 REST API Endpoints

### Authentication
- `POST /api/auth/register` — Create account with password hashing (bcrypt)
- `POST /api/auth/login` — Create server-side session with session regeneration
- `GET /api/auth/me` — Restore authenticated session state
- `POST /api/auth/logout` — Invalidate session and destroy cookie

### Resources
- `GET /api/resources` — List with category, status, search, and pagination
- `POST /api/resources` — Create resource (authenticated)
- `GET /api/resources/:id` — Get resource details with owner info
- `PATCH /api/resources/:id` — Update resource (owner or admin only)
- `DELETE /api/resources/:id` — Delete resource (owner or admin only)

### Lost & Found
- `GET /api/lost-found` — List with search, type (lost/found), and status filters
- `POST /api/lost-found` — Create lost/found report (authenticated)
- `GET /api/lost-found/:id` — Get item details
- `PATCH /api/lost-found/:id` — Update report (reporter or admin only)
- `DELETE /api/lost-found/:id` — Delete report (reporter or admin only)

### Claims
- `GET /api/claims` — List claims (user's own claims, or all for admin)
- `POST /api/claims` — Submit private ownership claim for a found item
- `PATCH /api/claims/:id` — Review claim: approve/reject (reporter or admin)
- `DELETE /api/claims/:id` — Withdraw pending claim (claimant only)

### Messages
- `GET /api/messages` — List user's conversations (inbox / sent)
- `POST /api/messages` — Send message regarding resource or found item
- `PATCH /api/messages/:id/read` — Mark incoming message as read

### Admin Control
- `GET /api/admin/stats` — Metrics for users, items, reports, and claims
- `GET /api/admin/users` — Paginated list of registered users
- `PATCH /api/admin/users/:id` — Toggle user role (`user` ↔ `admin`)
- `DELETE /api/admin/resources/:id` — Delete inappropriate resource
- `DELETE /api/admin/lost-found/:id` — Delete inappropriate report
- `GET /api/admin/claims` — View all system claims for audit

---

## ✅ Verification Checklist

- [x] Separate `resource sharing in mern` folder created without modifying original files
- [x] React + Vite + React Router + Axios setup
- [x] Express + Mongoose + MongoStore session backend
- [x] Server-side HttpOnly cookie sessions surviving page refreshes
- [x] Protected route guards for authenticated views
- [x] Role-based route guards for Admin panel
- [x] Complete CRUD for Resources with owner verification
- [x] Complete CRUD for Lost & Found items with type and status filtering
- [x] Item Claiming workflow with private verification details
- [x] In-app messaging system linked to resources & lost/found items
- [x] User Profile page displaying owned resources and reports
- [x] Administrator dashboard with metrics and moderation tools
- [x] Local MongoDB connection with Compass support
- [x] Safe local CLI admin promotion tool
- [x] Isolated test suite preventing test pollution of development database
