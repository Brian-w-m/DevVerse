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

```powershell
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

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