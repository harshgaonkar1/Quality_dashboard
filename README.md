# Service Ops Dashboard

Enterprise internal dashboard for tracking Product Replacement (and Part
Replacement) complaint ageing. Data is loaded from Excel initially; the
dashboard itself **only ever reads from Supabase PostgreSQL**.

## Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Highcharts, React Hook Form
- **Backend:** Node.js, Express, Multer, pg (node-postgres), ExcelJS
- **Database:** Supabase PostgreSQL

## Project Structure

```
dashboard-app/
├── backend/
│   ├── routes/          # Express route definitions
│   ├── controllers/     # Request handling, thin orchestration
│   ├── services/        # Business logic (Excel parsing, ageing calc, persistence)
│   ├── middlewares/      # Multer config, validation, error handling
│   ├── database/        # Supabase PostgreSQL connection + schema.sql
│   ├── models/           # Repository-pattern data access (parameterized SQL)
│   ├── uploads/          # Temp storage for uploaded Excel files
│   └── utils/            # Date parsing, ageing bucketing, response helpers
└── frontend/
    └── src/
        ├── components/    # Reusable UI (Sidebar, DataTable, SummaryCard, etc.)
        ├── pages/         # Route-level pages
        ├── services/      # Axios API wrappers
        ├── hooks/         # useFetch, useDebounce
        ├── utils/         # CSV export, date formatting
        └── layouts/       # DashboardLayout (sidebar + topbar shell)
```

## Setup

### 1. Database (Supabase PostgreSQL)

Configure your Supabase PostgreSQL credentials in `backend/.env`:

```env
# Full Connection String (Recommended for Supabase)
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?sslmode=require

# OR individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=dashboard_db
DB_SSL=true
```

Schema tables and column migrations are created automatically upon application startup.
Alternatively, you can manually run `backend/database/schema.sql` in your Supabase SQL Editor.

### 2. Backend

```bash
cd backend
npm install
npm run dev             # nodemon, http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Multipart upload of `productReplacement` and/or `partReplacement` Excel files |
| GET | `/api/product/dashboard` | Summary counts per ageing bucket |
| GET | `/api/product/details` | Paginated/searchable/sortable detail rows. Query params: `ageingCategory`, `page`, `pageSize`, `search`, `sortBy`, `sortDir`, `export=csv` |
| GET | `/api/part/dashboard` | Summary counts per ageing bucket for Part Replacement |
| GET | `/api/part/details` | Paginated/searchable/sortable detail rows for Part Replacement |
| GET | `/api/health` | Health check |

## Business Rules Implemented

- **Ageing** = `DOC - DOI`, stored as a whole number of days.
- Product Replacement dashboard is filtered to:
  - `FD ZBRN STATUS` in `Approved`, `Approved for Upgrade`
  - `TYPE OF DAMAGE` = `Functional`
- Ageing buckets: 0-3 Months (0-90d), 1 Year (91-365d), 2 Year (366-730d),
  3 Year (731-1095d), 4 Year (1096-1460d), More than 4 Years (1461d+).
- Duplicate Serial Numbers are never inserted (`ON CONFLICT (serial_number) DO NOTHING` + unique
  constraint on `serial_number`, plus in-file dedupe before insert).
- Invalid/missing dates and empty rows are skipped and reported back in the
  upload response (`skippedDetails`) and logged to `upload_logs`.
