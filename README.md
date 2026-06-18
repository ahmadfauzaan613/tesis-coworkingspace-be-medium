# CoSpace Asset Inventory Management Backend (Medium Layer)

REST API backend for the Coworking Space Equipment & Assets Inventory system, designed using Express, PostgreSQL, Knex.js, and JWT Authentication.

---

## 🛠️ Tech Stack & Architecture

- **Runtime**: Node.js (ES Modules syntax)
- **Framework**: Express.js
- **Database**: PostgreSQL (using Knex.js Query Builder)
- **Schema Name**: `tesis_medium`
- **Security**: JWT Admin Token Validation & Bcrypt Hashing
- **Documentation**: Swagger OpenAPI interactive page (hosted at `/api-docs`)

---

## 📂 Project Structure

- `index.js`: Express routing, middlewares, and API definitions.
- `db.js`: Knex database connection pooling initialization.
- `knexfile.js`: Environments database settings (manages pool connection and hooks to auto-create schema `tesis_medium`).
- `migrations/`: DB Schema files (creating `users`, `categories`, `assets`, and `stock_history`).
- `seeds/`: Initial records seeder (creates administrative account `admin`/`admin123` and initial asset items).

---

## 🚀 Setup & Run Instructions

### **1. Environment Variables**
Ensure PostgreSQL is active. Create a `.env` file inside this folder with:
```env
PORT=5000
JWT_SECRET=your_secure_secret_here

# PostgreSQL Credentials
POSTGRES_HOST=192.168.18.55
POSTGRES_PORT=5432
POSTGRES_USER=ahmadfauzaan
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database_name
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Run Database Migrations & Seeds**
This compiles the schema and seed data directly inside the `tesis_medium` PostgreSQL schema:
```bash
npx knex migrate:latest
npx knex seed:run
```

### **4. Start Server (Development Mode)**
```bash
npm run dev
```

- API Base URL: `http://localhost:5000`
- Interactive Swagger Page: `http://localhost:5000/api-docs`

---

## 📌 API Endpoint Index

### **Authentication**
- `POST /api/auth/login` - Admin authentication (Returns JWT Token)
- `GET /api/auth/me` - Verify JWT token and retrieve admin profile

### **Asset Categories**
- `GET /api/categories` - List categories
- `POST /api/categories` - Create new category

### **Asset Inventory**
- `GET /api/assets` - List assets (supports filters: `search`, `categoryId`, `status`, `lowStock`)
- `POST /api/assets` - Create asset (triggers transactional `INITIAL` stock logging)
- `PUT /api/assets/:id` - Update asset specifications (excluding stock levels)
- `DELETE /api/assets/:id` - Delete asset

### **Stock Audit Logs**
- `POST /api/assets/:id/stock` - Transaction-safe stock adjust (`ADDITION`, `DEDUCTION`, `DAMAGE`, `AUDIT`)
- `GET /api/history` - Read global stock logs audit trail
- `GET /api/assets/:id/history` - Read specific item log audit trail

### **Metrics & Export**
- `GET /api/dashboard/stats` - Total metrics counter (out of stock, broken, activity summary)
- `GET /api/assets/export` - Export list of assets as a `.csv` file download
