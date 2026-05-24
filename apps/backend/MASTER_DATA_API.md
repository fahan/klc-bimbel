# Master Data API Documentation

Comprehensive API reference for all Master Data endpoints (Branches, Subjects, SPP Rates, Curriculum Modules).

## Table of Contents
1. [Authentication](#authentication)
2. [Branches API](#branches-api)
3. [Subjects API](#subjects-api)
4. [SPP Rates API](#spp-rates-api)
5. [Curriculum Modules API](#curriculum-modules-api)
6. [Error Responses](#error-responses)

---

## Authentication

### Login Endpoint
**POST** `/auth/login`

Get JWT token needed for all protected endpoints.

#### Request
```json
{
  "email": "owner@bimbel.com",
  "password": "password"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id_1",
      "name": "Owner User",
      "email": "owner@bimbel.com",
      "phone": null,
      "role": "OWNER",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Test Credentials
```
OWNER:
  Email: owner@bimbel.com
  Password: password

ADMIN_GLOBAL:
  Email: admin@bimbel.com
  Password: password

ADMIN_CABANG (assigned to Purwokerto branch):
  Email: admin_cabang@bimbel.com
  Password: password

GURU:
  Email: guru@bimbel.com
  Password: password
```

### Authorization Header
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer {token}
```

---

## Branches API

### 1. List All Branches
**GET** `/branches`

List branches with role-based filtering.

#### Authorization
- **OWNER**: See all branches
- **ADMIN_GLOBAL**: See all branches
- **ADMIN_CABANG**: See only own branch
- **GURU**: Forbidden (403)

#### Request (with JWT token)
```bash
curl -X GET "http://localhost:3001/branches" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK) - OWNER
```json
{
  "success": true,
  "data": [
    {
      "id": "branch_id_1",
      "name": "Cabang Purwokerto",
      "code": "PWK",
      "address": "Jl. Jendral Sudirman No. 123",
      "phone": "0281-6123456",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": "branch_id_2",
      "name": "Cabang Jakarta",
      "code": "JKT",
      "address": "Jl. Sudirman No. 456",
      "phone": "021-5555555",
      "isActive": true,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-02T10:00:00.000Z"
    }
  ]
}
```

#### Response (403 Forbidden) - GURU
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

---

### 2. Get Single Branch
**GET** `/branches/:id`

Get detailed information about a specific branch.

#### Authorization
- **All authenticated users** can view any branch

#### Request
```bash
curl -X GET "http://localhost:3001/branches/branch_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "branch_id_1",
    "name": "Cabang Purwokerto",
    "code": "PWK",
    "address": "Jl. Jendral Sudirman No. 123",
    "phone": "0281-6123456",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

#### Response (404 Not Found)
```json
{
  "message": "Branch not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### 3. Create Branch
**POST** `/branches`

Create a new branch. **OWNER only**.

#### Authorization
- **OWNER**: ✅ Allowed
- **ADMIN_GLOBAL**: ❌ Forbidden
- **ADMIN_CABANG**: ❌ Forbidden
- **GURU**: ❌ Forbidden

#### Request
```bash
curl -X POST "http://localhost:3001/branches" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cabang Bandung",
    "code": "BDG",
    "address": "Jl. Ahmad Yani No. 789",
    "phone": "0274-1234567"
  }'
```

#### Request Body
```json
{
  "name": "Cabang Bandung",           // Required, unique, 3-100 chars
  "code": "BDG",                      // Required, unique, 2-20 chars
  "address": "Jl. Ahmad Yani No. 789", // Optional
  "phone": "0274-1234567"              // Optional
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "branch_id_3",
    "name": "Cabang Bandung",
    "code": "BDG",
    "address": "Jl. Ahmad Yani No. 789",
    "phone": "0274-1234567",
    "isActive": true,
    "createdAt": "2024-01-03T10:00:00.000Z",
    "updatedAt": "2024-01-03T10:00:00.000Z"
  },
  "message": "Branch created successfully"
}
```

#### Response (400 Bad Request) - Duplicate Name
```json
{
  "message": "Branch name already exists",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### Response (400 Bad Request) - Duplicate Code
```json
{
  "message": "Branch code already exists",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### Response (403 Forbidden) - Not OWNER
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

---

### 4. Update Branch
**PUT** `/branches/:id`

Update branch details.

#### Authorization
- **OWNER**: ✅ Can update any branch
- **ADMIN_GLOBAL**: ✅ Can update any branch
- **ADMIN_CABANG**: ✅ Can update only own branch
- **GURU**: ❌ Forbidden

#### Request
```bash
curl -X PUT "http://localhost:3001/branches/branch_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0281-9999999",
    "address": "Jl. Jendral Sudirman No. 999"
  }'
```

#### Request Body (all fields optional)
```json
{
  "name": "Cabang Purwokerto Updated",    // Optional, unique
  "code": "PWK",                          // Optional, unique
  "address": "Jl. Jendral Sudirman No. 999", // Optional
  "phone": "0281-9999999"                 // Optional
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "branch_id_1",
    "name": "Cabang Purwokerto",
    "code": "PWK",
    "address": "Jl. Jendral Sudirman No. 999",
    "phone": "0281-9999999",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-03T15:30:00.000Z"
  },
  "message": "Branch updated successfully"
}
```

#### Response (403 Forbidden) - ADMIN_CABANG updating other branch
```json
{
  "message": "You can only update your own branch",
  "error": "Forbidden",
  "statusCode": 403
}
```

---

### 5. Delete Branch
**DELETE** `/branches/:id`

Soft delete branch (isActive = false). **OWNER only**.

#### Authorization
- **OWNER**: ✅ Allowed
- Others: ❌ Forbidden

#### Request
```bash
curl -X DELETE "http://localhost:3001/branches/branch_id_2" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "branch_id_2",
    "name": "Cabang Jakarta",
    "code": "JKT",
    "address": "Jl. Sudirman No. 456",
    "phone": "021-5555555",
    "isActive": false,
    "createdAt": "2024-01-02T10:00:00.000Z",
    "updatedAt": "2024-01-03T15:45:00.000Z"
  },
  "message": "Branch deleted successfully"
}
```

---

## Subjects API

### 1. List All Subjects
**GET** `/subjects`

List all subjects with optional filtering.

#### Authorization
- **All authenticated users** can list subjects

#### Request (all subjects)
```bash
curl -X GET "http://localhost:3001/subjects" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Request (filter by tracking type)
```bash
curl -X GET "http://localhost:3001/subjects?trackingType=MODULE_BASED" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "subject_id_1",
      "name": "Matematika",
      "code": "MAT",
      "description": "Mata pelajaran matematika tingkat SMP",
      "trackingType": "MODULE_BASED",
      "capacity": 10,
      "maxCapacity": 30,
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z",
      "sppRates": [
        {
          "id": "rate_id_1",
          "subjectId": "subject_id_1",
          "type": "REGULAR",
          "amount": 500000,
          "effectiveFrom": "2024-01-01T00:00:00.000Z",
          "effectiveUntil": "2024-12-31T23:59:59.000Z",
          "isActive": true,
          "createdAt": "2024-01-01T10:00:00.000Z",
          "updatedAt": "2024-01-01T10:00:00.000Z"
        }
      ],
      "curriculumModules": [
        {
          "id": "module_id_1",
          "subjectId": "subject_id_1",
          "orderNumber": 1,
          "name": "Bab 1: Bilangan Bulat",
          "totalChapters": 5,
          "isActive": true,
          "createdAt": "2024-01-01T10:00:00.000Z",
          "updatedAt": "2024-01-01T10:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

### 2. Get Single Subject
**GET** `/subjects/:id`

Get detailed subject information with related SPP rates and curriculum modules.

#### Request
```bash
curl -X GET "http://localhost:3001/subjects/subject_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "subject_id_1",
    "name": "Matematika",
    "code": "MAT",
    "description": "Mata pelajaran matematika tingkat SMP",
    "trackingType": "MODULE_BASED",
    "capacity": 10,
    "maxCapacity": 30,
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "sppRates": [...],
    "curriculumModules": [...]
  }
}
```

---

### 3. Create Subject
**POST** `/subjects`

Create new subject. **OWNER and ADMIN_GLOBAL only**.

#### Authorization
- **OWNER**: ✅ Allowed
- **ADMIN_GLOBAL**: ✅ Allowed
- **ADMIN_CABANG**: ❌ Forbidden
- **GURU**: ❌ Forbidden

#### Request
```bash
curl -X POST "http://localhost:3001/subjects" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bahasa Indonesia",
    "code": "IND",
    "description": "Mata pelajaran bahasa Indonesia",
    "trackingType": "MODULE_BASED",
    "capacity": 5,
    "maxCapacity": 25
  }'
```

#### Request Body
```json
{
  "name": "Bahasa Indonesia",              // Required, 3-100 chars
  "code": "IND",                          // Required, unique, 2-20 chars
  "description": "Mata pelajaran bahasa Indonesia", // Optional
  "trackingType": "MODULE_BASED",         // Required: MODULE_BASED or FREE_MATERIAL
  "capacity": 5,                          // Optional, >= 1
  "maxCapacity": 25                       // Optional, >= 1
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "subject_id_2",
    "name": "Bahasa Indonesia",
    "code": "IND",
    "description": "Mata pelajaran bahasa Indonesia",
    "trackingType": "MODULE_BASED",
    "capacity": 5,
    "maxCapacity": 25,
    "isActive": true,
    "createdAt": "2024-01-04T10:00:00.000Z",
    "updatedAt": "2024-01-04T10:00:00.000Z"
  },
  "message": "Subject created successfully"
}
```

#### Response (400 Bad Request) - Duplicate Code
```json
{
  "message": "Subject code already exists",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 4. Update Subject
**PUT** `/subjects/:id`

Update subject details. **OWNER and ADMIN_GLOBAL only**.

#### Request
```bash
curl -X PUT "http://localhost:3001/subjects/subject_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "maxCapacity": 40,
    "description": "Matematika tingkat SMP dan SMA"
  }'
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "subject_id_1",
    "name": "Matematika",
    "code": "MAT",
    "description": "Matematika tingkat SMP dan SMA",
    "trackingType": "MODULE_BASED",
    "capacity": 10,
    "maxCapacity": 40,
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-04T11:00:00.000Z"
  },
  "message": "Subject updated successfully"
}
```

---

### 5. Delete Subject
**DELETE** `/subjects/:id`

Soft delete subject. **OWNER only**.

#### Request
```bash
curl -X DELETE "http://localhost:3001/subjects/subject_id_2" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "subject_id_2",
    "name": "Bahasa Indonesia",
    "code": "IND",
    "description": "Mata pelajaran bahasa Indonesia",
    "trackingType": "MODULE_BASED",
    "capacity": 5,
    "maxCapacity": 25,
    "isActive": false,
    "createdAt": "2024-01-04T10:00:00.000Z",
    "updatedAt": "2024-01-04T11:05:00.000Z"
  },
  "message": "Subject deleted successfully"
}
```

---

## SPP Rates API

### 1. List All SPP Rates
**GET** `/spp-rates`

List all SPP rates with optional subject filtering.

#### Authorization
- **All authenticated users** can list SPP rates

#### Request (all rates)
```bash
curl -X GET "http://localhost:3001/spp-rates" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Request (filter by subject)
```bash
curl -X GET "http://localhost:3001/spp-rates?subjectId=subject_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "rate_id_1",
      "subjectId": "subject_id_1",
      "type": "REGULAR",
      "amount": 500000,
      "effectiveFrom": "2024-01-01T00:00:00.000Z",
      "effectiveUntil": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": "rate_id_2",
      "subjectId": "subject_id_1",
      "type": "PRIVATE",
      "amount": 750000,
      "effectiveFrom": "2024-01-01T00:00:00.000Z",
      "effectiveUntil": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get SPP Rates by Subject
**GET** `/spp-rates/by-subject/:subjectId`

Get all rates for a specific subject.

#### Request
```bash
curl -X GET "http://localhost:3001/spp-rates/by-subject/subject_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "rate_id_1",
      "subjectId": "subject_id_1",
      "type": "REGULAR",
      "amount": 500000,
      "effectiveFrom": "2024-01-01T00:00:00.000Z",
      "effectiveUntil": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Currently Active SPP Rate
**GET** `/spp-rates/active/:subjectId/:type`

Get the currently effective SPP rate for a subject and type on today's date.

#### Request
```bash
curl -X GET "http://localhost:3001/spp-rates/active/subject_id_1/REGULAR" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "rate_id_1",
    "subjectId": "subject_id_1",
    "type": "REGULAR",
    "amount": 500000,
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveUntil": "2024-12-31T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

#### Response (404 Not Found) - No active rate
```json
{
  "message": "No active SPP rate found for the specified criteria",
  "error": "Not Found",
  "statusCode": 404
}
```

---

### 4. Get Single SPP Rate
**GET** `/spp-rates/:id`

Get detailed information about a specific SPP rate.

#### Request
```bash
curl -X GET "http://localhost:3001/spp-rates/rate_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "rate_id_1",
    "subjectId": "subject_id_1",
    "type": "REGULAR",
    "amount": 500000,
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveUntil": "2024-12-31T23:59:59.000Z",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

---

### 5. Create SPP Rate
**POST** `/spp-rates`

Create new SPP rate with date range validation. **OWNER and ADMIN_GLOBAL only**.

#### Authorization
- **OWNER**: ✅ Allowed
- **ADMIN_GLOBAL**: ✅ Allowed
- Others: ❌ Forbidden

#### Request
```bash
curl -X POST "http://localhost:3001/spp-rates" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "subject_id_1",
    "type": "PRIVATE",
    "amount": 750000,
    "effectiveFrom": "2024-01-01",
    "effectiveUntil": "2024-12-31"
  }'
```

#### Request Body
```json
{
  "subjectId": "subject_id_1",           // Required, must exist
  "type": "REGULAR",                    // Required: REGULAR or PRIVATE
  "amount": 500000,                     // Required, >= 0
  "effectiveFrom": "2024-01-01",        // Required, ISO 8601 date
  "effectiveUntil": "2024-12-31"        // Optional, ISO 8601 date
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "rate_id_2",
    "subjectId": "subject_id_1",
    "type": "PRIVATE",
    "amount": 750000,
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveUntil": "2024-12-31T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2024-01-04T12:00:00.000Z",
    "updatedAt": "2024-01-04T12:00:00.000Z"
  },
  "message": "SPP Rate created successfully"
}
```

#### Response (400 Bad Request) - Invalid date range
```json
{
  "message": "effectiveFrom must be before effectiveUntil",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### Response (400 Bad Request) - Subject not found
```json
{
  "message": "Subject not found",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 6. Update SPP Rate
**PUT** `/spp-rates/:id`

Update SPP rate with date validation. **OWNER and ADMIN_GLOBAL only**.

#### Request
```bash
curl -X PUT "http://localhost:3001/spp-rates/rate_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 550000,
    "effectiveUntil": "2024-06-30"
  }'
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "rate_id_1",
    "subjectId": "subject_id_1",
    "type": "REGULAR",
    "amount": 550000,
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveUntil": "2024-06-30T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-04T12:05:00.000Z"
  },
  "message": "SPP Rate updated successfully"
}
```

---

### 7. Delete SPP Rate
**DELETE** `/spp-rates/:id`

Soft delete SPP rate. **OWNER only**.

#### Request
```bash
curl -X DELETE "http://localhost:3001/spp-rates/rate_id_2" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "rate_id_2",
    "subjectId": "subject_id_1",
    "type": "PRIVATE",
    "amount": 750000,
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveUntil": "2024-12-31T00:00:00.000Z",
    "isActive": false,
    "createdAt": "2024-01-04T12:00:00.000Z",
    "updatedAt": "2024-01-04T12:10:00.000Z"
  },
  "message": "SPP Rate deleted successfully"
}
```

---

## Curriculum Modules API

### 1. List All Curriculum Modules
**GET** `/curriculum-modules`

List all curriculum modules with optional subject filtering.

#### Authorization
- **All authenticated users** can list modules

#### Request (all modules)
```bash
curl -X GET "http://localhost:3001/curriculum-modules" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Request (filter by subject)
```bash
curl -X GET "http://localhost:3001/curriculum-modules?subjectId=subject_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "module_id_1",
      "subjectId": "subject_id_1",
      "orderNumber": 1,
      "name": "Bab 1: Bilangan Bulat",
      "totalChapters": 5,
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": "module_id_2",
      "subjectId": "subject_id_1",
      "orderNumber": 2,
      "name": "Bab 2: Pecahan",
      "totalChapters": 6,
      "isActive": true,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-02T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Modules by Subject
**GET** `/curriculum-modules/by-subject/:subjectId`

Get all curriculum modules for a specific subject (ordered by orderNumber).

#### Request
```bash
curl -X GET "http://localhost:3001/curriculum-modules/by-subject/subject_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "module_id_1",
      "subjectId": "subject_id_1",
      "orderNumber": 1,
      "name": "Bab 1: Bilangan Bulat",
      "totalChapters": 5,
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": "module_id_2",
      "subjectId": "subject_id_1",
      "orderNumber": 2,
      "name": "Bab 2: Pecahan",
      "totalChapters": 6,
      "isActive": true,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-02T10:00:00.000Z"
    }
  ]
}
```

---

### 3. Get Single Module
**GET** `/curriculum-modules/:id`

Get detailed information about a specific curriculum module.

#### Request
```bash
curl -X GET "http://localhost:3001/curriculum-modules/module_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "module_id_1",
    "subjectId": "subject_id_1",
    "orderNumber": 1,
    "name": "Bab 1: Bilangan Bulat",
    "totalChapters": 5,
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}
```

---

### 4. Create Curriculum Module
**POST** `/curriculum-modules`

Create new curriculum module with unique (subjectId, orderNumber) constraint. **OWNER and ADMIN_GLOBAL only**.

#### Authorization
- **OWNER**: ✅ Allowed
- **ADMIN_GLOBAL**: ✅ Allowed
- Others: ❌ Forbidden

#### Request
```bash
curl -X POST "http://localhost:3001/curriculum-modules" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectId": "subject_id_1",
    "orderNumber": 3,
    "name": "Bab 3: Persamaan Linear",
    "totalChapters": 7
  }'
```

#### Request Body
```json
{
  "subjectId": "subject_id_1",           // Required, must exist
  "orderNumber": 3,                     // Required, >= 1, unique per subject
  "name": "Bab 3: Persamaan Linear",    // Required, 3-200 chars
  "totalChapters": 7                    // Required, >= 1
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "module_id_3",
    "subjectId": "subject_id_1",
    "orderNumber": 3,
    "name": "Bab 3: Persamaan Linear",
    "totalChapters": 7,
    "isActive": true,
    "createdAt": "2024-01-05T10:00:00.000Z",
    "updatedAt": "2024-01-05T10:00:00.000Z"
  },
  "message": "Curriculum module created successfully"
}
```

#### Response (400 Bad Request) - Duplicate orderNumber
```json
{
  "message": "A module with this order number already exists for this subject",
  "error": "Bad Request",
  "statusCode": 400
}
```

#### Response (400 Bad Request) - Subject not found
```json
{
  "message": "Subject not found",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 5. Update Curriculum Module
**PUT** `/curriculum-modules/:id`

Update module with unique orderNumber validation. **OWNER and ADMIN_GLOBAL only**.

#### Request
```bash
curl -X PUT "http://localhost:3001/curriculum-modules/module_id_1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "totalChapters": 6,
    "name": "Bab 1: Bilangan Bulat (Revised)"
  }'
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "module_id_1",
    "subjectId": "subject_id_1",
    "orderNumber": 1,
    "name": "Bab 1: Bilangan Bulat (Revised)",
    "totalChapters": 6,
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-05T11:00:00.000Z"
  },
  "message": "Curriculum module updated successfully"
}
```

---

### 6. Reorder Curriculum Modules
**POST** `/curriculum-modules/reorder`

Bulk update orderNumbers for multiple modules. **OWNER and ADMIN_GLOBAL only**.

#### Request
```bash
curl -X POST "http://localhost:3001/curriculum-modules/reorder" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "module_id_1",
      "orderNumber": 2
    },
    {
      "id": "module_id_2",
      "orderNumber": 1
    },
    {
      "id": "module_id_3",
      "orderNumber": 3
    }
  ]'
```

#### Request Body (array of modules)
```json
[
  {
    "id": "module_id_1",
    "orderNumber": 2
  },
  {
    "id": "module_id_2",
    "orderNumber": 1
  }
]
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "module_id_1",
      "subjectId": "subject_id_1",
      "orderNumber": 2,
      "name": "Bab 1: Bilangan Bulat",
      "totalChapters": 5,
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-05T11:30:00.000Z"
    },
    {
      "id": "module_id_2",
      "subjectId": "subject_id_1",
      "orderNumber": 1,
      "name": "Bab 2: Pecahan",
      "totalChapters": 6,
      "isActive": true,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-05T11:30:00.000Z"
    }
  ],
  "message": "Curriculum modules reordered successfully"
}
```

---

### 7. Delete Curriculum Module
**DELETE** `/curriculum-modules/:id`

Soft delete curriculum module. **OWNER only**.

#### Request
```bash
curl -X DELETE "http://localhost:3001/curriculum-modules/module_id_3" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "module_id_3",
    "subjectId": "subject_id_1",
    "orderNumber": 3,
    "name": "Bab 3: Persamaan Linear",
    "totalChapters": 7,
    "isActive": false,
    "createdAt": "2024-01-05T10:00:00.000Z",
    "updatedAt": "2024-01-05T11:45:00.000Z"
  },
  "message": "Curriculum module deleted successfully"
}
```

---

## Error Responses

### 401 Unauthorized (No token or invalid token)
```json
{
  "message": "Unauthorized",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden (Insufficient role)
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "message": "Resource not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### 400 Bad Request (Validation failure)
```json
{
  "message": "Email should not be empty",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Complete Example Flow

### 1. Login as OWNER
```bash
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@bimbel.com",
    "password": "password"
  }'
```

Save the returned `token` for subsequent requests.

### 2. Create a Subject
```bash
TOKEN="your_token_here"

curl -X POST "http://localhost:3001/subjects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fisika",
    "code": "FIS",
    "description": "Mata pelajaran fisika",
    "trackingType": "MODULE_BASED",
    "capacity": 8,
    "maxCapacity": 25
  }'
```

Save returned `id` as `SUBJECT_ID`.

### 3. Create SPP Rate for Subject
```bash
SUBJECT_ID="subject_id_from_previous"

curl -X POST "http://localhost:3001/spp-rates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"type\": \"REGULAR\",
    \"amount\": 600000,
    \"effectiveFrom\": \"2024-01-01\",
    \"effectiveUntil\": \"2024-12-31\"
  }"
```

### 4. Create Curriculum Modules
```bash
SUBJECT_ID="subject_id_from_previous"

curl -X POST "http://localhost:3001/curriculum-modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"orderNumber\": 1,
    \"name\": \"Bab 1: Kinematika\",
    \"totalChapters\": 4
  }"

curl -X POST "http://localhost:3001/curriculum-modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectId\": \"$SUBJECT_ID\",
    \"orderNumber\": 2,
    \"name\": \"Bab 2: Dinamika\",
    \"totalChapters\": 5
  }"
```

### 5. Verify Subject with Relations
```bash
SUBJECT_ID="subject_id_from_previous"

curl -X GET "http://localhost:3001/subjects/$SUBJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

Response will include sppRates and curriculumModules arrays.

---

## Testing Tips

1. **Use Postman/Insomnia**: Import endpoints and save Bearer token in auth header
2. **Swagger UI**: Visit http://localhost:3001/api and use Authorize button
3. **Test Role Access**: Create 3 separate logins (OWNER, ADMIN_GLOBAL, GURU) and test access
4. **Verify Relationships**: Create subject → add rates → add modules → get subject (verify relations)
5. **Check Soft Deletes**: Delete entity → list (should not appear) → verify isActive=false
6. **Date Validation**: Try SPP rate with effectiveFrom > effectiveUntil (should fail)
7. **Unique Constraints**: Try creating duplicate branch code/subject code (should fail)

