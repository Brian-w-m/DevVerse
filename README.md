# DevVerse

This repository contains three main components:

- `backend/` — Go API server with DynamoDB local support
- `frontend/` — Next.js web app
- `extension/` — VS Code extension project

---

## Prerequisites

Make sure you have the following installed:

- Node.js 18+ and npm/yarn/pnpm
- Go 1.20+ (for backend development)
- Docker and Docker Compose (optional, but recommended for local setup)
- Visual Studio Code (for extension development)

---

## Local development

### Quick Start with Docker Compose

The easiest way to get everything running locally is with Docker Compose:

```powershell
# Make sure you're in the project root
docker compose up --build
```

Docker Compose will automatically:
- Start DynamoDB Local
- Create the Users table
- Seed test users
- Start the backend API
- Start the frontend

Then visit:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080`

The frontend will automatically authenticate with the mock user `dev-user-001` and fetch real data from DynamoDB.

### Manual Setup (For Development)

If you prefer to run services locally without Docker:

#### Step 1: Start DynamoDB Local

```powershell
# Option A: Using Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Option B: If you have DynamoDB Local installed
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

#### Step 2: Create DynamoDB Tables

```powershell
# Users table (PK: ID)
aws dynamodb create-table `
  --table-name Users `
  --attribute-definitions AttributeName=ID,AttributeType=S `
  --key-schema AttributeName=ID,KeyType=HASH `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --endpoint-url http://localhost:8000 `
  --region ap-southeast-2

# Sessions table (PK: UserID, SK: SessionID)
aws dynamodb create-table `
  --table-name Sessions `
  --attribute-definitions AttributeName=UserID,AttributeType=S AttributeName=SessionID,AttributeType=S `
  --key-schema AttributeName=UserID,KeyType=HASH AttributeName=SessionID,KeyType=RANGE `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --endpoint-url http://localhost:8000 `
  --region ap-southeast-2

# DailyActivity table (PK: UserID, SK: Date)
aws dynamodb create-table `
  --table-name DailyActivity `
  --attribute-definitions AttributeName=UserID,AttributeType=S AttributeName=Date,AttributeType=S `
  --key-schema AttributeName=UserID,KeyType=HASH AttributeName=Date,KeyType=RANGE `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --endpoint-url http://localhost:8000 `
  --region ap-southeast-2
```

#### Step 3: Seed Test Data

```powershell
cd backend
DYNAMODB_ENDPOINT=http://localhost:8000 make seed
```

This will add 5 test users to DynamoDB:
- `dev-user-001` (Developer) - Score: 4250
- `user-1` (Alex Chen) - Score: 5840
- `user-2` (Jordan Smith) - Score: 5320
- `user-3` (Casey Parker) - Score: 4890
- `user-4` (Morgan Lee) - Score: 4560

#### Step 4: Start Backend

In a terminal, set environment variables and run the backend:

```powershell
cd backend

# Create a local .env file if it doesn't exist
# Set these environment variables:
$env:DYNAMODB_ENDPOINT = "http://localhost:8000"
$env:DYNAMODB_TABLE = "Users"
$env:JWT_SECRET = "test1234"

make run
```

#### Step 5: Start Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` and you'll see the landing page. Click "Launch Demo" to enter with the test user, then the dashboard will fetch real data from DynamoDB.

---

### 1. Backend

The backend is a Go service in `backend/`.

```powershell
cd backend
go mod download
make run
```

This runs the service directly from source. The backend listens on `http://localhost:8080` by default.

If you want to build a binary:

```powershell
cd backend
make build
./bin/server
```

To run backend tests:

```powershell
cd backend
make test
```

### 2. Frontend

The frontend is a Next.js app in `frontend/`.

First, set up GitHub OAuth credentials:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set the Redirect URI to `http://localhost:3000/auth/callback` (for local development)
4. Copy the Client ID and Client Secret
5. Create `frontend/.env.local`:

```env
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

Then run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser. Click "Login with GitHub" on the landing page to authenticate.

If the frontend needs the backend API, it expects the backend at `http://localhost:8080` by default.

### 3. VS Code extension

The extension is located in `extension/`.

```powershell
cd extension
npm install
npm run compile
```

To run or debug the extension:

1. Open the repo in VS Code.
   - If you opened the root workspace, ensure `.vscode/launch.json` points to `./extension` and `./extension/out/**/*.js`.
   - Alternatively, open `c:\Users\Brian\Downloads\DevVerse\extension` directly in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Use the Command Palette to run `DevVerse: Login with GitHub` or click the DevVerse status bar item.
4. Make sure your backend is running at `http://localhost:8080` or set `BACKEND_URL` in the root `.env` file.

The extension will activate when you login, then it will track text edits and send scores to the backend.

**Note:** You can also log in via the web UI at `http://localhost:3000` without using the extension.

---

## Docker Compose setup

To run frontend, backend, and DynamoDB together using Docker Compose:

```powershell
docker compose up --build
```

Then visit:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- DynamoDB Local: `http://localhost:8000`

### Notes

- The Docker Compose setup mounts source code for hot reload.
- Create a root `.env` file if your backend or Docker Compose setup depends on environment variables.

---

## Inspect DynamoDB Local

If you are running DynamoDB locally, use the AWS CLI to inspect tables:

```powershell
aws dynamodb list-tables --endpoint-url http://localhost:8000
aws dynamodb scan --table-name Users --endpoint-url http://localhost:8000
```

If you want a single user by ID:

```powershell
aws dynamodb get-item --table-name Users --key '{"ID": {"S": "your-user-id"}}' --endpoint-url http://localhost:8000
```

---

## Useful commands

From the root folder, use these commands in the relevant subfolders:

- `backend`: `make run`, `make build`, `make test`
- `frontend`: `npm run dev`, `npm run build`, `npm run lint`
- `extension`: `npm run compile`, `npm run watch`, `npm run lint`

---

## Troubleshooting

- If VS Code reports `Cannot find module ./out/extension.js`, run `npm run compile` inside `extension/` first.
- If your extension project is moved into a different folder, update `.vscode/launch.json` to point to the correct path.
- If you see empty document change events in the extension, the listener may still be active and is detecting non-content changes.

If you need more help, open the relevant folder and verify the correct workspace path before launching the Extension Development Host.