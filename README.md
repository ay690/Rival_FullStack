# Fullstack Rival — Task Management App

A full-stack task management application with role-based access control, file attachments, activity logging, and an admin dashboard. Built with Next.js 16 on the frontend and Express + Prisma on the backend.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Running with Docker](#running-with-docker)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [File Uploads](#file-uploads)

---

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Frontend   | Next.js 16, React 19, TypeScript, Tailwind CSS v4       |
| UI         | shadcn/ui, Radix UI, Lucide Icons                       |
| Backend    | Express 5, TypeScript, tsx                              |
| ORM        | Prisma 7 (Neon Postgres adapter)                        |
| Database   | PostgreSQL via [Neon](https://neon.tech)                |
| Auth       | JWT (7-day expiry), bcrypt password hashing             |
| File Upload| Multer (disk storage, 10 MB limit)                      |
| Container  | Docker + Docker Compose                                 |

---

## Project Structure

```
fullstack_rival/
├── app/                        # Next.js App Router pages
│   ├── (auth)/
│   │   ├── login/              # Login page
│   │   └── signup/             # Sign-up page
│   └── (dashboard)/
│       ├── layout.tsx          # Shared dashboard layout with navbar
│       ├── dashboard/          # Main task list page
│       ├── tasks/
│       │   ├── new/            # Create task form
│       │   └── [id]/           # Task detail / edit page
│       └── admin/              # Admin-only dashboard
├── components/                 # Shared React components
│   ├── ui/                     # shadcn/ui primitives
│   ├── navbar.tsx
│   ├── task-card.tsx
│   ├── task-filters.tsx
│   ├── task-form.tsx
│   └── attachments-panel.tsx
├── hooks/                      # Custom React hooks
│   ├── use-auth.ts
│   └── use-tasks.ts
├── lib/                        # Utilities and API client
│   ├── api.ts                  # Typed fetch wrappers for all endpoints
│   ├── auth.ts                 # localStorage token helpers
│   └── utils.ts
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.ts            # App entry point
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.ts         # /api/auth
│   │   │   ├── tasks.ts        # /api/tasks
│   │   │   ├── attachments.ts  # /api/tasks/:taskId/attachments
│   │   │   └── admin.ts        # /api/admin
│   │   └── seed.ts             # Database seed script
│   └── prisma/
│       └── schema.prisma
├── Dockerfile                  # Frontend container
├── docker-compose.yml
└── server/Dockerfile           # Backend container
```

---

## Features

### User Features
- **Authentication** — Sign up and log in with email/password. Sessions are JWT-based and stored in `localStorage`.
- **Task Management** — Create, view, edit, and delete tasks. Each task has a title, description, status, priority, and optional due date.
- **Filtering & Search** — Filter tasks by status (`TODO`, `IN_PROGRESS`, `DONE`). Search by title with 300 ms debounce. Sort by creation date, due date, or priority.
- **Pagination** — Tasks are paginated (9 per page on the dashboard).
- **File Attachments** — Upload files to any task. Supported types: images (JPEG, PNG, GIF, WebP, SVG), PDF, Word, Excel, and plain text. Max size: 10 MB per file.
- **Activity Log** — Every task change (create, edit, status change, attachment upload/download/delete) is recorded and shown on the task detail page.

### Admin Features
- **Admin Dashboard** — Accessible only to users with the `ADMIN` role. Redirects regular users to `/dashboard`.
- **Platform Stats** — Total users, total tasks, and a breakdown by status (Todo / In Progress / Done) with a completion rate.
- **User Management** — View all registered users with their role, task count, and join date. Delete any non-admin user (cascade-deletes all their tasks).
- **All Tasks View** — Browse every task across all users with owner info, status, priority, and due date. Paginated (10 per page).

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- A [Neon](https://neon.tech) PostgreSQL database (or any standard PostgreSQL instance — remove the Neon adapter from `schema.prisma` if using a local DB)

### Local Development

**1. Clone and install dependencies**

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

**2. Configure environment variables**

Set up the frontend `.env` at the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Set up the backend `server/.env`:

```env
DATABASE_URL=your_neon_connection_string
DIRECT_URL=your_neon_direct_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

**3. Run Prisma migrations**

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

Optionally seed the database with sample data:

```bash
npm run seed
```

**4. Start the development servers**

In two separate terminals:

```bash
# Terminal 1 — Backend (from /server)
npm run dev

# Terminal 2 — Frontend (from project root)
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

### Running with Docker

**Important:** `NEXT_PUBLIC_API_URL` is embedded into the Next.js bundle at build time. You must pass it as a build argument so the frontend container knows where the backend is.

**1. Set your secrets in the shell (or a `.env` file)**

```bash
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."
export JWT_SECRET="your_secret_key"
```

**2. Build and start both containers**

```bash
docker compose up --build
```

To pass the `NEXT_PUBLIC_API_URL` build arg explicitly:

```bash
docker compose build \
  --build-arg NEXT_PUBLIC_API_URL=http://server:5000/api \
  frontend
docker compose up
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

**3. Stop containers**

```bash
docker compose down
```

---

## Environment Variables

### Frontend (root `.env`)

| Variable               | Description                        | Default                        |
| ---------------------- | ---------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_URL`  | Base URL of the Express API        | `http://localhost:5000/api`    |

### Backend (`server/.env`)

| Variable       | Description                                      | Required |
| -------------- | ------------------------------------------------ | -------- |
| `DATABASE_URL` | Prisma connection URL (pooled for Neon)          | Yes      |
| `DIRECT_URL`   | Direct (non-pooled) connection URL for migrations| Yes      |
| `JWT_SECRET`   | Secret key used to sign and verify JWTs          | Yes      |
| `PORT`         | Port the Express server listens on               | `5000`   |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Auth

| Method | Path              | Auth | Description                          |
| ------ | ----------------- | ---- | ------------------------------------ |
| POST   | `/auth/signup`    | No   | Register a new user                  |
| POST   | `/auth/login`     | No   | Log in, returns JWT + user object    |

**Signup / Login body:**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
```

**Response:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Alice", "email": "...", "role": "USER", "createdAt": "..." }
}
```

---

### Tasks

All task routes require authentication. Users only see and modify their own tasks. Admins can access all tasks.

| Method | Path           | Description                                      |
| ------ | -------------- | ------------------------------------------------ |
| GET    | `/tasks`       | List tasks (filterable, searchable, paginated)   |
| POST   | `/tasks`       | Create a new task                                |
| GET    | `/tasks/:id`   | Get a single task with its activity log          |
| PATCH  | `/tasks/:id`   | Partial update (title, description, status, priority, dueDate) |
| DELETE | `/tasks/:id`   | Delete a task                                    |

**GET `/tasks` query parameters:**

| Param    | Type                            | Description                    |
| -------- | ------------------------------- | ------------------------------ |
| `status` | `TODO \| IN_PROGRESS \| DONE`   | Filter by status               |
| `search` | string                          | Case-insensitive title search  |
| `sortBy` | `createdAt \| dueDate \| priority` | Sort field (default: `createdAt`) |
| `order`  | `asc \| desc`                   | Sort direction (default: `desc`) |
| `page`   | number                          | Page number (default: `1`)     |
| `limit`  | number                          | Results per page (default: `10`, max: `100`) |

**Task object:**
```json
{
  "id": "clxyz...",
  "title": "Fix bug",
  "description": "Optional details",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2026-07-01T00:00:00.000Z",
  "userId": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### Attachments

| Method | Path                                              | Description                    |
| ------ | ------------------------------------------------- | ------------------------------ |
| GET    | `/tasks/:taskId/attachments`                      | List attachments for a task    |
| POST   | `/tasks/:taskId/attachments`                      | Upload a file (`multipart/form-data`, field name: `file`) |
| DELETE | `/tasks/:taskId/attachments/:attachmentId`        | Delete an attachment           |
| GET    | `/tasks/:taskId/attachments/:attachmentId/download` | Download a file              |

Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/plain`.

Max file size: **10 MB**.

---

### Admin

All admin routes require authentication and the `ADMIN` role. Non-admins receive `403 Forbidden`.

| Method | Path                   | Description                                      |
| ------ | ---------------------- | ------------------------------------------------ |
| GET    | `/admin/stats`         | Platform stats (user count, task count, by status) |
| GET    | `/admin/users`         | All users with task counts                       |
| DELETE | `/admin/users/:id`     | Delete a user and all their tasks (cannot self-delete) |
| GET    | `/admin/tasks`         | All tasks across all users (paginated, filterable) |

---

## Database Schema

```
User
  id, email (unique), password (hashed), name, role (USER|ADMIN)
  → has many Task

Task
  id, title, description?, status (TODO|IN_PROGRESS|DONE), priority (LOW|MEDIUM|HIGH)
  dueDate?, userId (FK → User)
  → has many Attachment
  → has many ActivityLog

Attachment
  id, taskId (FK → Task), filename (on disk), originalName, mimeType, size

ActivityLog
  id, taskId (FK → Task), action, detail?, createdAt
```

Cascade deletes are in place: deleting a User removes all their Tasks; deleting a Task removes all its Attachments and ActivityLog entries.

---

## Authentication

- Passwords are hashed with **bcrypt** (12 rounds).
- JWTs are signed with `HS256` and expire after **7 days**.
- The token payload contains `{ id, email, role }`.
- Tokens are stored in `localStorage` on the client and sent as `Authorization: Bearer <token>` on every API request.
- The `authenticate` middleware on the server validates the token and attaches the decoded user to `req.user`.

---

## File Uploads

Uploaded files are stored on disk in `server/uploads/`. Filenames are randomised (`<timestamp>-<random>.<ext>`) to prevent collisions. The original filename is preserved in the database and used as the `Content-Disposition` header on download.

When running in Docker, the `uploads/` directory lives inside the container. To persist uploads across restarts, mount a volume in `docker-compose.yml`:

```yaml
services:
  server:
    volumes:
      - uploads_data:/app/uploads

volumes:
  uploads_data:
```
