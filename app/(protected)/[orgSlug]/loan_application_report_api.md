# API Reference – Loan Application Report Module

> Base URL: `/api/admin/reports`
> Auth: `Authorization: Bearer {token}` on all requests
> Required Header: `X-Tenant-ID: {bank-slug}` on all requests
> Content-Type: `application/json`

---

## Overview

The Loan Application Report module exposes three read-only endpoints that power the loan applications report screen. Data is sourced from the `application_dataset` view (tenant database), joined with `coapplicants` to include the primary applicant's Equifax credit score.

### Architecture

```
Request
  │
  ├─ auth:sanctum         → validates Bearer token
  ├─ authorize            → checks permission (reports.view)
  └─ X-Tenant-ID header
        │
        ▼
   TenantManager::switchToTenant()
        │
        ▼
   tenant DB → application_dataset view (pivoted lapp_meta)
             + coapplicants (primary applicant score)
```

> **Multi-DB Note:** The `application_dataset` view is per-bank (tenant DB). You **must** send `X-Tenant-ID` on every request. The backend dynamically switches the database connection based on the registered tenant slug.

---

## Required Headers

```http
Authorization: Bearer {sanctum_token}
X-Tenant-ID: {bank-slug}
Accept: application/json
```

---

## Endpoints

### 1. List Loan Applications (Paginated)

Returns a paginated list of loan applications. On first load with no filters, all applications are returned.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/reports/loan-applications` |
| **Route Name** | `admin.reports.loan-applications` |
| **Auth** | Required |
| **Permission** | `reports.view` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter by application status (exact match). Use filter-options endpoint for valid values. |
| `loan_product` | string | No | Filter by loan product name (exact match). Use filter-options endpoint for valid values. |
| `from_date` | `Y-m-d` | No | Include only applications on or after this date. |
| `to_date` | `Y-m-d` | No | Include only applications on or before this date. Must be ≥ `from_date`. |
| `per_page` | integer | No | Rows per page. Min: 1, Max: 100. Default: 15. |
| `page` | integer | No | Page number. Default: 1. |

**Example Request (first load — no filters):**

```http
GET /api/admin/reports/loan-applications HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1Q...
X-Tenant-ID: cosmos-bank
Accept: application/json
```

**Example Request (with filters):**

```http
GET /api/admin/reports/loan-applications?status=Approved&loan_product=HOME+LOAN&from_date=2026-01-01&to_date=2026-04-30&per_page=20 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1Q...
X-Tenant-ID: cosmos-bank
Accept: application/json
```

**Success Response — `200 OK`:**

```json
{
  "status": "success",
  "data": [
    {
      "lapp_id": "LA2024001",
      "stage": "LOAN_OFFER",
      "status": "Approved",
      "first_name": "Rajesh",
      "last_name": "Kumar",
      "mobile": "9876543210",
      "cif_no": "CIF001234",
      "loan_product": "HOME LOAN",
      "loan_scheme": "Residential",
      "loan_amount_requested": "5000000",
      "sanction_amount": "5000000",
      "eligible_roi": "8.5",
      "eligible_emi": "44000",
      "eligible_tenure": "240",
      "score": "780",
      "branch": "DELHI-MAIN",
      "state": "Delhi",
      "district": "Central Delhi",
      "application_date": "2026-01-15"
    }
  ],
  "meta": {
    "total": 142,
    "per_page": 15,
    "current_page": 1,
    "last_page": 10
  }
}
```

**Response Fields:**

| Field | Source | Description |
|---|---|---|
| `lapp_id` | `lapp_meta.object_id` | Application ID (displayed as ID/STAGE column) |
| `stage` | `lapp_meta` (key: `stage`) | Current journey step |
| `status` | `lapp_meta` (key: `status`) | Application status (Approved, Processing, Submitted, etc.) |
| `first_name` | `lapp_meta` (key: `first_name`) | Primary applicant first name |
| `last_name` | `lapp_meta` (key: `last_name`) | Primary applicant last name |
| `mobile` | `lapp_meta` (key: `mobile`) | Primary applicant mobile |
| `cif_no` | `lapp_meta` (key: `cif_no`) | Bank CBS CIF number |
| `loan_product` | `lapp_meta` (key: `loan_product`) | Loan product name (LOAN ASSET column) |
| `loan_scheme` | `lapp_meta` (key: `loan_scheme`) | Loan scheme name (shown below product) |
| `loan_amount_requested` | `lapp_meta` (key: `loan_amount_requested`) | Requested amount in INR (FINANCIALS column) |
| `sanction_amount` | `lapp_meta` (key: `sanction_amount`) | Sanctioned amount in INR |
| `eligible_roi` | `lapp_meta` (key: `eligible_roi`) | Rate of interest (%) |
| `eligible_emi` | `lapp_meta` (key: `eligible_emi`) | EMI amount in INR |
| `eligible_tenure` | `lapp_meta` (key: `eligible_tenure`) | Loan tenure in months |
| `score` | `coapplicants.equifax_score_value` (sequence_no=1) | Equifax credit score (SCORE column) |
| `branch` | `lapp_meta` (key: `branch`) | Branch code |
| `state` | `lapp_meta` (key: `state`) | State |
| `district` | `lapp_meta` (key: `district`) | District |
| `application_date` | `lapp_meta` (key: `application_date`) | Date of application |

---

### 2. Filter Options (Dropdown Data)

Returns all distinct status values and loan product names currently present in the tenant database. Use this to populate the STATUS and PRODUCT filter dropdowns on the report screen.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/reports/loan-applications/filter-options` |
| **Route Name** | `admin.reports.loan-applications.filter-options` |
| **Auth** | Required |
| **Permission** | `reports.view` |

**Example Request:**

```http
GET /api/admin/reports/loan-applications/filter-options HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1Q...
X-Tenant-ID: cosmos-bank
Accept: application/json
```

**Success Response — `200 OK`:**

```json
{
  "status": "success",
  "data": {
    "statuses": [
      "Approved",
      "Processing",
      "Rejected",
      "Submitted"
    ],
    "loan_products": [
      "CAR LOAN",
      "HOME LOAN",
      "PERSONAL LOAN"
    ]
  }
}
```

> **Frontend Usage:** Call this endpoint once when the report page loads to build the STATUS and LOAN PRODUCT dropdowns. Values are returned alphabetically.

---

### 3. Export to CSV

Exports all applications matching the current filters as a downloadable CSV file. The response is a streamed file download — no pagination is applied.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/admin/reports/loan-applications/export` |
| **Route Name** | `admin.reports.loan-applications.export` |
| **Auth** | Required |
| **Permission** | `reports.view` |

**Query Parameters:**

Same filter params as the list endpoint (`status`, `loan_product`, `from_date`, `to_date`). `per_page` and `page` are ignored.

**Example Request:**

```http
GET /api/admin/reports/loan-applications/export?status=Approved&from_date=2026-01-01&to_date=2026-04-30 HTTP/1.1
Authorization: Bearer eyJ0eXAiOiJKV1Q...
X-Tenant-ID: cosmos-bank
Accept: text/csv
```

**Response:**

```
HTTP/1.1 200 OK
Content-Type: text/csv; charset=UTF-8
Content-Disposition: attachment; filename="loan_applications_2026-04-27_10-30-00.csv"
```

**CSV Columns (in order):**

| Column | Description |
|---|---|
| Application ID | `lapp_id` |
| Stage | Journey stage |
| Status | Application status |
| First Name | Applicant first name |
| Last Name | Applicant last name |
| Mobile | Mobile number |
| CIF No | CBS CIF number |
| Loan Product | Loan product name |
| Loan Scheme | Scheme name |
| Loan Amount Requested | In INR |
| Sanction Amount | In INR |
| Eligible ROI (%) | Rate of interest |
| Eligible EMI | In INR |
| Eligible Tenure | In months |
| Score | Equifax credit score |
| Branch | Branch code |
| State | State name |
| District | District name |
| Application Date | Date of application |

> **Note:** The export honours the same filters as the list view. If no filters are applied, all applications are exported.

---

## Error Responses

| HTTP Code | Scenario |
|---|---|
| `400 Bad Request` | `X-Tenant-ID` header is missing |
| `401 Unauthorized` | Bearer token is missing or invalid |
| `403 Forbidden` | Authenticated user does not have `reports.view` permission |
| `404 Not Found` | Tenant slug not found in the landlord database |
| `422 Unprocessable Entity` | Validation failed (e.g., invalid date format, `to_date` before `from_date`) |

**Example 400 Response:**

```json
{
  "message": "X-Tenant-ID header is required."
}
```

**Example 422 Response:**

```json
{
  "message": "The to date field must be a date after or equal to from date.",
  "errors": {
    "to_date": ["The to date field must be a date after or equal to from date."]
  }
}
```

---

## Frontend Integration Guide

### Page Load Sequence

```
1. GET /api/admin/reports/loan-applications/filter-options
      → populate STATUS dropdown
      → populate LOAN PRODUCT dropdown

2. GET /api/admin/reports/loan-applications
      → render initial table (all applications, page 1)
```

### On Submit (filter search)

```
GET /api/admin/reports/loan-applications
  ?status={selectedStatus}
  &loan_product={selectedProduct}
  &from_date={fromDate}        ← format: YYYY-MM-DD
  &to_date={toDate}            ← format: YYYY-MM-DD
  &per_page=15
  &page=1
```

Reset to `page=1` on every new filter submission.

### On Pagination

```
GET /api/admin/reports/loan-applications
  ?status={selectedStatus}        ← preserve active filters
  &loan_product={selectedProduct}
  &from_date={fromDate}
  &to_date={toDate}
  &per_page=15
  &page={clickedPage}             ← only page changes
```

### On Download Button

Open in a new tab or trigger a file download:

```
GET /api/admin/reports/loan-applications/export
  ?status={selectedStatus}
  &loan_product={selectedProduct}
  &from_date={fromDate}
  &to_date={toDate}
```

Pass the same filters that are currently active in the search form. The response streams directly as a `.csv` file.

### "View File" Button

To open a specific application's offer letter PDF:

```
GET /api/v1/loan/loan-offers/{lapp_id}
X-Tenant-ID: {bank-slug}
```

---

## Permissions Setup

Add the following permission row to the `permissions` table so the `RouteAuthorize` middleware automatically protects the report routes:

```sql
INSERT INTO permissions (name, created_at, updated_at)
VALUES ('reports.view', NOW(), NOW());
```

Then assign it to the roles that should access the report (e.g., `admin`, `super_admin`, `checker`):

```http
POST /api/admin/roles/{role}/permissions
Content-Type: application/json

{ "permission": "reports.view" }
```

> **Note:** If the `reports.view` permission row does not exist in the database, the `RouteAuthorize` middleware will allow all authenticated users to access the endpoints (open-access fallback behaviour).

---

## Files Reference

| File | Purpose |
|---|---|
| `app/Http/Controllers/Admin/ReportController.php` | Controller — list, filter-options, export |
| `app/Services/ReportService.php` | Query builder, tenant switching, CSV data |
| `routes/api.php` | Route definitions under `admin/reports` prefix |
| `database/migrations/tenant/2026_04_21_000001_create_application_dataset_view.php` | SQL view sourcing all report data |
| `database/migrations/tenant/2026_03_27_130433_create_lapp_metas_table.php` | EAV table backing the view |
| `database/migrations/tenant/2026_04_06_000001_create_coapplicants_table.php` | Credit score source |
