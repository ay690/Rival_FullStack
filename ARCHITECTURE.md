# Architecture

## Overview

`fullstack_rival` is a fullstack task-management application built with a **Next.js 16** frontend and a standalone **Express 5** backend. The two services communicate over HTTP via a typed REST API. A Neon serverless PostgreSQL database is accessed exclusively through the backend via Prisma ORM.

```
┌─────────────────────────┐        HTTP/REST        ┌──────────────────────────┐
│   Next.js 16 Frontend   │ ──────────────────────▶ │   Express 5 Backend      │
│   (React 19, port 3000) │ ◀────────────────────── │   (Node.js, port 4000)   │
└─────────────────────────┘       Bearer JWT         └────────────┬─────────────┘
                                                                   │ Prisma ORM
                                                                   ▼
                                                     ┌──────────────────────────┐
                                                     │  Neon PostgreSQL (cloud) │
                                                     └──────────────────────────┘
```

---

## Repository Layout

```
fullstack_rival/
├── app/                     # Next.js App Router pages
│   ├── (auth)/              # Login & signup pages (no nav)
│   ├── (dashboard)/         # Protected pages with Navbar
│   │   ├── layout.tsx       # Auth guard + Navbar shell
│   │   ├── dashboard/       # Task list
│   │   ├── tasks/
│   │   │   ├── new/         # Create task form
│   │   │   └── [id]/        # Task detail & edit
│   │   └── admin/           # Admin panel (ADMIN role only)
│   ├── layout.tsx           # Root layout (fonts, ThemeProvider)
│   ├── page.tsx             # Root redirect → /dashboard or /login
│   └── not-found.tsx
├── components/              # Shared UI components
│   └── ui/                  # shadcn/ui primitives
├── hooks/                   # React custom hooks
├── lib/                     # Client-side utilities
├── server/                  # Express backend (independent Node project)
│   ├── src/
│   │   ├── index.ts         # App entry, middleware, route mounting
│   │   ├── db.ts            # Prisma client (Neon adapter)
│   │   ├── middleware/
│   │   │   └── auth.ts      # JWT Bearer verification
│   │   └── routes/
│   │       ├── auth.ts      # POST /api/auth/signup|login
│   │       ├── tasks.ts     # CRUD /api/tasks
│   │       ├── attachments.ts # File upload/download /api/tasks/:id/attachments
│   │       └── admin.ts     # Admin endpoints /api/admin
│   └── prisma/
│       └── schema.prisma    # DB models and enums
├── docker-compose.yml       # Two-service Compose setup
├── Dockerfile               # Frontend image
└── server/Dockerfile        # Backend image
```

---

## Frontend

### Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| UI runtime | React 19.2.4 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix UI primitives) |
| Icons | lucide-react |
| Dark mode | next-themes |
| Type checking | TypeScript 5 |

### Routing

Next.js App Router route groups keep the auth and dashboard layouts separate.

- `(auth)` — Login and signup. No navigation bar, no auth guard.
- `(dashboard)` — All protected pages. The group layout (`layout.tsx`) wraps children in `<Providers>` (auth context) and `<DashboardGuard>`, which redirects unauthenticated users to `/login` and renders `<Navbar>`.
- Root `page.tsx` — Reads the token from `localStorage` and immediately redirects to `/dashboard` or `/login`.

### State Management

There is no external state library. Application state is managed with:

- **`AuthContext`** (`hooks/use-auth.ts`) — Holds the current user and JWT token. Hydrated from `localStorage` on mount. Provides `login()` and `logout()` callbacks. Wrapped by `<Providers>` → `<AuthContext.Provider>`.
- **Local component state** — The dashboard page manages task list state, search debouncing, filters, and pagination inline with `useState`/`useEffect`/`useCallback`.
- **Data-fetching hooks** — `useTasks(params)` and `useTask(id)` in `hooks/use-tasks.ts` encapsulate loading/error state for reuse.

### API Communication (`lib/api.ts`)

A generic `apiFetch<T>()` wrapper handles:
- Attaching `Authorization: Bearer <token>` headers
- Setting `Content-Type: application/json` (omitted for `FormData` so `multer` can parse the multipart boundary)
- Parsing error bodies and re-throwing with a human-readable message

Four typed API namespaces are exported: `authApi`, `tasksApi`, `attachmentsApi`, `adminApi`.

Base URL is read from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api`).

### Auth Persistence (`lib/auth.ts`)

Token and user object are persisted in `localStorage` under the keys `"token"` and `"user"`. All functions guard against server-side rendering with `typeof window === "undefined"` checks.

---

## Backend

### Tech Stack

| Layer | Choice |
|---|---|
| HTTP server | Express 5.2.x |
| Runtime | Node.js (ESM, `"type": "module"`) |
| Language | TypeScript 6 (executed via `tsx`) |
| ORM | Prisma 7.8 with `@prisma/adapter-neon` |
| Auth | `jsonwebtoken` (JWT) + `bcrypt` |
| File uploads | multer 2.x (disk storage) |
| Dev server | nodemon |

### Entry Point (`src/index.ts`)

CORS is configured to allow `http://localhost:3000` with credentials. Routes are mounted in this order:

```
/api/auth/*                      → authRouter         (no auth middleware)
/api/tasks/:taskId/attachments/* → attachmentsRouter   (authenticate)
/api/tasks/*                     → tasksRouter         (authenticate)
/api/admin/*                     → adminRouter         (authenticate + requireAdmin)
```

A global error handler catches any unhandled errors and responds with `500`.

### Authentication Middleware (`src/middleware/auth.ts`)

Reads the `Authorization: Bearer <token>` header, verifies the JWT with `JWT_SECRET`, and attaches `req.user = { id, email, role }` for downstream use. Returns `401` if missing or invalid.

### Routes

**`auth.ts`**
- `POST /api/auth/signup` — validates name/email/password, hashes password with bcrypt (12 rounds), creates user, returns JWT + user object.
- `POST /api/auth/login` — looks up user by email, verifies password, returns JWT + user object.
- JWTs are signed with a 7-day expiry.

**`tasks.ts`**
- Full CRUD on tasks. Requires `authenticate`.
- `userFilter()` scopes queries to `{ userId: req.user.id }` unless the caller is `ADMIN`, in which case all tasks are visible.
- `GET /api/tasks` supports `status`, `search` (case-insensitive title contains), `sortBy` (`createdAt` | `dueDate` | `priority`), `order`, `page`, and `limit` query params.
- Creates an `ActivityLog` entry on task creation and on each changed field during a `PATCH`.

**`attachments.ts`**
- Scoped to `GET|POST|DELETE /api/tasks/:taskId/attachments`.
- Files saved to `server/uploads/` on disk with randomised filenames. Metadata stored in the `Attachment` table.
- Upload limit: 10 MB. Allowed MIME types: JPEG, PNG, GIF, WebP, SVG, PDF, Word (doc/docx), Excel (xls/xlsx), plain text.
- `GET /:attachmentId/download` streams the file directly from disk with correct `Content-Disposition` and `Content-Type` headers.
- All upload/delete/download actions append an `ActivityLog` entry on the parent task.

**`admin.ts`**
- `GET /api/admin/stats` — total user count, total task count, task counts per status.
- `GET /api/admin/users` — all users with their task count.
- `GET /api/admin/tasks` — all tasks across all users, paginated, filterable by `userId`, `status`, `search`. Includes owner info.
- `DELETE /api/admin/users/:id` — deletes a user. Cascade deletion removes their tasks (enforced at the DB level). Self-deletion is blocked.

### Database (`src/db.ts`)

A single `PrismaClient` instance is created with the `PrismaNeon` adapter, which enables the Prisma serverless driver for Neon's HTTP-based connection pooler.

---

## Data Model

```
User
├── id          CUID (PK)
├── email       unique
├── password    bcrypt hash
├── name
├── role        USER | ADMIN  (default: USER)
├── createdAt / updatedAt
└── tasks       Task[]

Task
├── id          CUID (PK)
├── title
├── description (nullable)
├── status      TODO | IN_PROGRESS | DONE  (default: TODO)
├── priority    LOW | MEDIUM | HIGH         (default: MEDIUM)
├── dueDate     (nullable)
├── createdAt / updatedAt
├── userId      → User (CASCADE delete)
├── activityLog ActivityLog[]
└── attachments Attachment[]

Attachment
├── id           CUID (PK)
├── taskId       → Task (CASCADE delete)
├── filename     disk filename (randomised)
├── originalName original upload name
├── mimeType
├── size         bytes
└── createdAt

ActivityLog
├── id        CUID (PK)
├── taskId    → Task (CASCADE delete)
├── action    string  (e.g. "created", "updated", "attachment added")
├── detail    string? (human-readable description of the change)
└── createdAt
```

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/login` | — | Login, receive JWT |
| GET | `/api/tasks` | JWT | List own tasks (filterable, paginated) |
| POST | `/api/tasks` | JWT | Create task |
| GET | `/api/tasks/:id` | JWT | Get task + activity log |
| PATCH | `/api/tasks/:id` | JWT | Partial update task |
| DELETE | `/api/tasks/:id` | JWT | Delete task |
| GET | `/api/tasks/:id/attachments` | JWT | List task attachments |
| POST | `/api/tasks/:id/attachments` | JWT | Upload file (`multipart/form-data`, field: `file`) |
| DELETE | `/api/tasks/:id/attachments/:aid` | JWT | Delete attachment |
| GET | `/api/tasks/:id/attachments/:aid/download` | JWT | Stream file download |
| GET | `/api/admin/stats` | JWT (ADMIN) | Platform statistics |
| GET | `/api/admin/users` | JWT (ADMIN) | All users with task counts |
| GET | `/api/admin/tasks` | JWT (ADMIN) | All tasks across all users |
| DELETE | `/api/admin/users/:uid` | JWT (ADMIN) | Delete user (cascade) |

---

## Authentication Flow

```
Client                          Server
  │                               │
  │  POST /api/auth/login         │
  │  { email, password }  ──────▶ │  bcrypt.compare()
  │                               │  jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: "7d" })
  │  { token, user }      ◀────── │
  │                               │
  │  localStorage.setItem(token)  │
  │  AuthContext.login(token, user)│
  │                               │
  │  GET /api/tasks               │
  │  Authorization: Bearer <JWT>  │
  │                       ──────▶ │  authenticate middleware
  │                               │  jwt.verify() → req.user
  │  { tasks, total, ... }◀────── │
```

Token and user object are stored in `localStorage`. There are no HTTP-only cookies or refresh tokens. The token is valid for 7 days and cannot be invalidated server-side before expiry.

---

## Environment Variables

**Frontend**

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | Backend API base URL |

**Backend (`server/.env`)**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string |
| `DIRECT_URL` | Neon direct connection string (used by Prisma migrations) |
| `JWT_SECRET` | Secret key for signing/verifying JWTs |
| `PORT` | Server listen port (defaults to `4000`; Docker sets `5000`) |

---

## Docker Deployment

`docker-compose.yml` defines two services:

| Service | Image | Port | Notable Config |
|---|---|---|---|
| `rival_server` | `./server/Dockerfile` | `5000:5000` | Mounts `uploads_data` volume, injects all server env vars |
| `rival_frontend` | `./Dockerfile` | `3000:3000` | `NEXT_PUBLIC_API_URL=http://server:5000/api` |

The named volume `uploads_data` persists uploaded files across container restarts. The frontend uses the Docker internal hostname `server` to reach the backend, rather than `localhost`.

> Note: The compose file has not been validated locally due to virtualization limitations on the development machine.

---

## Local Development

```bash
# Backend — from /server
npm install
npm run dev          # nodemon + tsx, port 5000

# Frontend — from root
npm install
npm run dev          # Next.js dev server, port 3000

# Database migrations — from /server
npx prisma migrate dev

# Seed — from /server
npm run seed
```
