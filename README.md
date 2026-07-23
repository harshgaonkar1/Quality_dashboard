# Service Ops Dashboard

Enterprise internal dashboard for tracking Product Replacement (and Part
Replacement) complaint ageing. Data is loaded from Excel initially; the
dashboard itself **only ever reads from MySQL**.

## Stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Axios, Highcharts, React Hook Form
- **Backend:** Node.js, Express, Multer, mysql2, ExcelJS
- **Database:** MySQL

## Project Structure

```
dashboard-app/
├── backend/
│   ├── routes/          # Express route definitions
│   ├── controllers/     # Request handling, thin orchestration
│   ├── services/        # Business logic (Excel parsing, ageing calc, persistence)
│   ├── middlewares/      # Multer config, validation, error handling
│   ├── database/        # MySQL connection + schema.sql
│   ├── models/           # Repository-pattern data access (raw SQL)
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

### 1. Database

```bash
mysql -u root -p < backend/database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # then edit DB credentials
npm install
npm run dev             # nodemon, http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Multipart upload of `productReplacement` and/or `partReplacement` Excel files |
| GET | `/api/product/dashboard` | Summary counts per ageing bucket |
| GET | `/api/product/details` | Paginated/searchable/sortable detail rows. Query params: `ageingCategory`, `page`, `pageSize`, `search`, `sortBy`, `sortDir`, `export=csv` |
| GET | `/api/health` | Health check |

## Business Rules Implemented

- **Ageing** = `DOC - DOI`, stored as a whole number of days.
- Product Replacement dashboard is filtered to:
  - `FD ZBRN STATUS` in `Approved`, `Approved for Upgrade`
  - `TYPE OF DAMAGE` = `Functional`
- Ageing buckets: 0-3 Months (0-90d), 1 Year (91-365d), 2 Year (366-730d),
  3 Year (731-1095d), 4 Year (1096-1460d), More than 4 Years (1461d+).
- Duplicate Complaint Numbers are never inserted (`INSERT IGNORE` + unique
  constraint on `complaint_number`, plus in-file dedupe before insert).
- Invalid/missing dates and empty rows are skipped and reported back in the
  upload response (`skippedDetails`) and logged to `upload_logs`.

## Notes on Extending

- **Part Replacement**: the `part_replacement` table, upload pipeline, and
  API convention already exist. Build out `partReplacementModel.js` /
  `Service` / `Controller` / `Routes` mirroring the Product Replacement
  files, then flesh out `PartReplacementDashboard` + `Details` pages the
  same way `ProductReplacement.jsx` / `ProductReplacementDetails.jsx` are built.
- **Removing Excel upload later**: simply stop mounting `uploadRoutes` in
  `server.js` and remove the Upload page/link — no other code changes
  needed, since every dashboard read already goes through MySQL only.
