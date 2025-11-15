# Test Endpoints Documentation

Test endpoints for verifying backend functionality.

## Base URL
`http://localhost:3000/api/test`

---

## Endpoints

### 1. Health Check
**GET** `/test/health`

Basic health check to verify the server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Backend is running",
  "timestamp": "2025-11-15T10:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/test/health
```

---

### 2. Server Info
**GET** `/test/info`

Get server information including uptime and environment.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

**Example:**
```bash
curl http://localhost:3000/api/test/info
```

---

### 3. Database Test
**GET** `/test/database`

Test database connection and get user count.

**Response:**
```json
{
  "connected": true,
  "userCount": 5,
  "message": "Database connection successful"
}
```

**Example:**
```bash
curl http://localhost:3000/api/test/database
```

---

### 4. System Test
**GET** `/test/system`

Full system test including server and database status.

**Response:**
```json
{
  "server": {
    "status": "ok",
    "timestamp": "2025-11-15T10:00:00.000Z",
    "uptime": 123.456,
    "environment": "development"
  },
  "database": {
    "connected": true,
    "userCount": 5
  },
  "status": "all_systems_operational"
}
```

**Example:**
```bash
curl http://localhost:3000/api/test/system
```

---

### 5. Telegram Init Data Test
**POST** `/test/telegram`

Test Telegram init data validation.

**Headers:**
```
x-telegram-init-data: <telegram_init_data>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User found",
  "user": {
    "id": "uuid",
    "telegramId": "123456789",
    "name": "John Doe"
  }
}
```

**Response (User Not Found):**
```json
{
  "success": true,
  "message": "User not found",
  "user": null
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid Telegram init data",
  "error": "Invalid Telegram init data"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/test/telegram \
  -H "x-telegram-init-data: <your_init_data>"
```

---

### 6. Echo Test
**POST** `/test/echo`

Echo endpoint for testing requests and headers.

**Body:**
```json
{
  "test": "data",
  "number": 123
}
```

**Response:**
```json
{
  "message": "Echo test",
  "received": {
    "body": {
      "test": "data",
      "number": 123
    },
    "headers": {
      "x-telegram-init-data": "present",
      "content-type": "application/json"
    },
    "timestamp": "2025-11-15T10:00:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/test/echo \
  -H "Content-Type: application/json" \
  -H "x-telegram-init-data: test" \
  -d '{"test": "data", "number": 123}'
```

---

## Quick Test Script

You can use this script to test all endpoints:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/test"

echo "1. Testing Health Check..."
curl -s "$BASE_URL/health" | jq

echo -e "\n2. Testing Server Info..."
curl -s "$BASE_URL/info" | jq

echo -e "\n3. Testing Database..."
curl -s "$BASE_URL/database" | jq

echo -e "\n4. Testing System..."
curl -s "$BASE_URL/system" | jq

echo -e "\n5. Testing Echo..."
curl -s -X POST "$BASE_URL/echo" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' | jq
```

---

## Browser Testing

You can also test these endpoints directly in your browser:

1. **Health Check**: http://localhost:3000/api/test/health
2. **Server Info**: http://localhost:3000/api/test/info
3. **Database Test**: http://localhost:3000/api/test/database
4. **System Test**: http://localhost:3000/api/test/system

---

## Postman/Insomnia Collection

You can import these endpoints into Postman or Insomnia:

- **Base URL**: `http://localhost:3000/api/test`
- **Endpoints**: All endpoints listed above
- **Headers**: 
  - `Content-Type: application/json` (for POST requests)
  - `x-telegram-init-data: <your_init_data>` (for Telegram test)

