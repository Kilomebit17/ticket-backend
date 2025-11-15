# Tickets App Backend

Backend API for the Tickets App built with NestJS and TypeScript.

## Features

- **Authentication**: Telegram WebApp init data validation and user management
- **User Management**: User profiles, user board (contacts), and user details
- **Family System**: Create families, invite members, manage family relationships
- **Task System**: Create tasks with ticket rewards, perform tasks, and approve completed tasks
- **Ticket Balance**: Manage user ticket balances

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Telegram Bot Token

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - Database credentials
   - Telegram Bot Token (get it from [@BotFather](https://t.me/botfather))

4. Start PostgreSQL database

5. Run the application:
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### Authentication

- `GET /api/auth/me` - Check if user exists (returns 404 if not found)
- `POST /api/auth/register` - Register new user
  - Body: `{ name: string, sex: 'man' | 'woman' }`
  - Headers: `x-telegram-init-data: <telegram_init_data>`

### User

- `GET /api/user/me` - Get current user info
- `PUT /api/user/me` - Update current user info
  - Body: `{ name?: string, bio?: string, photoUrl?: string }`
- `GET /api/user/:id` - Get user details by ID
- `POST /api/user/board` - Get user board (users from Telegram contacts)
  - Body: `{ telegramIds: string[] }`

### Family

- `POST /api/family` - Create a new family
  - Body: `{ name: string }`
- `GET /api/family` - Get user's families
- `GET /api/family/:id` - Get family by ID
- `POST /api/family/:id/invite` - Invite user to family
  - Body: `{ toUserId: string }`
- `GET /api/family/invites` - Get user's invites (sent and received)
- `PUT /api/family/invites/respond` - Respond to invite
  - Body: `{ inviteId: string, accept: boolean }`

### Tasks

- `POST /api/task` - Create a new task
  - Body: `{ familyId: string, name: string, description?: string, price: number }`
- `GET /api/task/my` - Get user's tasks (created and solved)
- `GET /api/task/family/:familyId` - Get tasks for a family
- `GET /api/task/:id` - Get task by ID
- `POST /api/task/perform` - Perform a task
  - Body: `{ taskId: string }`
- `PUT /api/task/approve` - Approve a completed task
  - Body: `{ taskId: string }`

### Tickets

- `GET /api/ticket/balance` - Get user's ticket balance

## Authentication

All endpoints (except `/api/auth/me` and `/api/auth/register`) require authentication via Telegram init data.

The frontend should send the Telegram init data in the `x-telegram-init-data` header.

## Database Schema

- **users**: User accounts with Telegram integration
- **families**: Family groups
- **family_invites**: Family membership invites
- **tasks**: Tasks with ticket rewards
- **family_members**: Many-to-many relationship between users and families

## Development

```bash
# Watch mode
npm run start:dev

# Build
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

## License

MIT

