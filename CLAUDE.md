---
name: Project Setup & Guidelines
description: Project context, setup instructions, and coding guidelines for Claude
type: reference
---

## Project Overview

DevVerse is a full-stack web application with a dashboard featuring stats API, seed data, and a revamped frontend UI. It uses GitHub OAuth for authentication.

## Tech Stack

- **Backend**: Node.js/Express (implied from OAuth/GitHub integration)
- **Frontend**: Modern JavaScript/TypeScript with dashboard UI
- **Database**: Likely SQL or NoSQL (check package.json for specifics)
- **Authentication**: GitHub OAuth

## Setup Instructions

1. Install dependencies: `npm install` or `pnpm install`
2. Configure environment variables (check `.env.example` if present)
3. Run migrations if needed
4. Start the dev server

## Coding Style

- Follow existing code patterns in the repository
- Use imperative form for task subjects (e.g., "Add user profile" not "Add user profile feature")
- Mark tasks as `completed` only when fully accomplished
- Never mark tasks as completed if tests are failing or implementation is partial

## Common Tasks

- API routes: Check existing patterns in `routes/` or `controllers/`
- Frontend components: Located in the frontend directory structure
- Authentication flow: Implemented via GitHub OAuth integration
- Seed data: Provided for initial dashboard population

## Notes

- The repository has a clean git status currently
- Recent work included stats API, seed data, dashboard, and README addition
- Login flow was recently updated
