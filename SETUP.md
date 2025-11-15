# Database Setup Guide

## PostgreSQL Installation & Setup

### macOS

#### Option 1: Using Homebrew (Recommended)

1. **Install PostgreSQL:**
```bash
brew install postgresql@15
```

2. **Start PostgreSQL service:**
```bash
# Start PostgreSQL service
brew services start postgresql@15

# Or start manually (without auto-start on boot)
pg_ctl -D /usr/local/var/postgresql@15 start
```

3. **Verify PostgreSQL is running:**
```bash
psql postgres
# If successful, you'll see a PostgreSQL prompt. Type \q to exit.
```

4. **Create the database:**
```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE tickets_app;

# Create a user (optional, or use default postgres user)
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE tickets_app TO postgres;

# Exit
\q
```

#### Option 2: Using Postgres.app

1. Download from: https://postgresapp.com/
2. Install and open the app
3. Click "Initialize" to create a new server
4. The default database name is your username

#### Option 3: Using Docker

```bash
# Run PostgreSQL in Docker
docker run --name tickets-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tickets_app \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

---

### Linux (Ubuntu/Debian)

1. **Install PostgreSQL:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

2. **Start PostgreSQL service:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Enable auto-start on boot
```

3. **Create database:**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE tickets_app;

# Exit
\q
```

---

### Windows

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer
   - Run the installer and follow the setup wizard

2. **Start PostgreSQL:**
   - PostgreSQL service should start automatically
   - Or use Services (services.msc) to start "postgresql-x64-XX" service

3. **Create database using pgAdmin:**
   - Open pgAdmin (installed with PostgreSQL)
   - Right-click "Databases" → "Create" → "Database"
   - Name: `tickets_app`
   - Click "Save"

---

## Verify Database Connection

After setting up PostgreSQL, verify the connection:

```bash
# Test connection (macOS/Linux)
psql -h localhost -U postgres -d tickets_app

# Or using connection string
psql postgresql://postgres:postgres@localhost:5432/tickets_app
```

---

## Environment Configuration

Make sure your `.env` file in the backend directory has the correct database settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=tickets_app
```

---

## Troubleshooting

### PostgreSQL not starting (macOS)

```bash
# Check if PostgreSQL is already running
brew services list

# Restart PostgreSQL
brew services restart postgresql@15

# Check logs
tail -f /usr/local/var/log/postgresql@15.log
```

### Port 5432 already in use

```bash
# Find what's using port 5432
lsof -i :5432

# Kill the process if needed
kill -9 <PID>
```

### Connection refused

- Make sure PostgreSQL is running
- Check firewall settings
- Verify the port (default: 5432)
- Check PostgreSQL configuration: `postgresql.conf` and `pg_hba.conf`

---

## Quick Start Commands (macOS with Homebrew)

```bash
# Start PostgreSQL
brew services start postgresql@15

# Stop PostgreSQL
brew services stop postgresql@15

# Restart PostgreSQL
brew services restart postgresql@15

# Check status
brew services list | grep postgresql
```

---

## Database Management

### Useful PostgreSQL Commands

```bash
# Connect to database
psql -d tickets_app

# List all databases
\l

# Connect to specific database
\c tickets_app

# List all tables
\dt

# Describe a table
\d users

# Exit
\q
```

---

## Next Steps

Once PostgreSQL is running and the database is created:

1. **Start the backend:**
```bash
cd backend
npm install
npm run start:dev
```

2. **The backend will automatically create tables** (if `NODE_ENV` is not `production`)

3. **Verify tables were created:**
```bash
psql -d tickets_app
\dt
```

You should see tables: `users`, `families`, `family_invites`, `tasks`, `family_members`

