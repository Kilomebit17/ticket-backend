# API Documentation

## Base URL
`http://localhost:3000/api`

## Authentication
All endpoints (except auth endpoints) require Telegram init data in the header:
```
x-telegram-init-data: <telegram_init_data>
```

---

## Auth Endpoints

### Check User
```http
GET /auth/me
Headers:
  x-telegram-init-data: <telegram_init_data>
```

**Response:**
- `200 OK`: User exists
  ```json
  {
    "user": {
      "id": "uuid",
      "telegramId": "string",
      "firstName": "string",
      "lastName": "string | null",
      "username": "string | null",
      "name": "string",
      "sex": "man" | "woman",
      "balance": 0,
      "bio": "string | null",
      "photoUrl": "string | null",
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- `404 Not Found`: User doesn't exist

---

### Register User
```http
POST /auth/register
Headers:
  x-telegram-init-data: <telegram_init_data>
Body:
  {
    "name": "string",
    "sex": "man" | "woman"
  }
```

**Response:**
- `201 Created`:
  ```json
  {
    "user": { ... }
  }
  ```

---

## User Endpoints

### Get Current User
```http
GET /user/me
```

**Response:**
```json
{
  "user": { ... }
}
```

---

### Update Current User
```http
PUT /user/me
Body:
  {
    "name": "string (optional)",
    "bio": "string (optional)",
    "photoUrl": "string (optional)"
  }
```

**Response:**
```json
{
  "user": { ... }
}
```

---

### Get User Details
```http
GET /user/:id
```

**Response:**
```json
{
  "user": { ... }
}
```

---

### Get User Board (Contacts)
```http
POST /user/board
Body:
  {
    "telegramIds": ["string", ...]
  }
```

**Response:**
```json
{
  "users": [
    { ... },
    ...
  ]
}
```

---

## Family Endpoints

### Create Family
```http
POST /family
Body:
  {
    "name": "string"
  }
```

**Response:**
```json
{
  "family": {
    "id": "uuid",
    "name": "string",
    "creatorId": "uuid",
    "members": [{ ... }],
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Get User's Families
```http
GET /family
```

**Response:**
```json
{
  "families": [
    { ... },
    ...
  ]
}
```

---

### Get Family by ID
```http
GET /family/:id
```

**Response:**
```json
{
  "family": {
    "id": "uuid",
    "name": "string",
    "creatorId": "uuid",
    "members": [{ ... }],
    "tasks": [{ ... }],
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Invite User to Family
```http
POST /family/:id/invite
Body:
  {
    "toUserId": "uuid"
  }
```

**Response:**
```json
{
  "invite": {
    "id": "uuid",
    "familyId": "uuid",
    "fromUserId": "uuid",
    "toUserId": "uuid",
    "status": "pending",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Get User Invites
```http
GET /family/invites
```

**Response:**
```json
{
  "sent": [
    {
      "id": "uuid",
      "familyId": "uuid",
      "fromUserId": "uuid",
      "toUserId": "uuid",
      "status": "pending" | "accepted" | "rejected",
      "toUser": { ... },
      "fromUser": { ... },
      "createdAt": "date"
    },
    ...
  ],
  "received": [
    { ... },
    ...
  ]
}
```

---

### Respond to Invite
```http
PUT /family/invites/respond
Body:
  {
    "inviteId": "uuid",
    "accept": true | false
  }
```

**Response:**
```json
{
  "invite": { ... }
}
```

---

## Task Endpoints

### Create Task
```http
POST /task
Body:
  {
    "familyId": "uuid",
    "name": "string",
    "description": "string (optional)",
    "price": 100
  }
```

**Response:**
```json
{
  "task": {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "price": 100,
    "status": "Created",
    "familyId": "uuid",
    "creatorId": "uuid",
    "solverId": "uuid | null",
    "createdAt": "date",
    "solvedAt": "date | null",
    "approvedAt": "date | null",
    "updatedAt": "date"
  }
}
```

**Note:** Creating a task deducts the ticket price from the creator's balance.

---

### Get User's Tasks
```http
GET /task/my
```

**Response:**
```json
{
  "created": [
    { ... },
    ...
  ],
  "solved": [
    { ... },
    ...
  ]
}
```

---

### Get Family Tasks
```http
GET /task/family/:familyId
```

**Response:**
```json
{
  "tasks": [
    { ... },
    ...
  ]
}
```

---

### Get Task by ID
```http
GET /task/:id
```

**Response:**
```json
{
  "task": { ... }
}
```

---

### Perform Task
```http
POST /task/perform
Body:
  {
    "taskId": "uuid"
  }
```

**Response:**
```json
{
  "task": { ... }
}
```

**Note:** Changes task status from "Created" to "Pending" and assigns the solver.

---

### Approve Task
```http
PUT /task/approve
Body:
  {
    "taskId": "uuid"
  }
```

**Response:**
```json
{
  "task": { ... }
}
```

**Note:** 
- Only the task creator can approve
- Changes status from "Pending" to "Approved"
- Adds ticket reward to solver's balance

---

## Ticket Endpoints

### Get Balance
```http
GET /ticket/balance
```

**Response:**
```json
{
  "balance": 1000
}
```

---

## Error Responses

All endpoints may return:

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid Telegram init data
- `403 Forbidden`: User doesn't have permission
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

