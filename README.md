# First Press

A small MVC book-review portal built with Node.js, Express, EJS and MongoDB. Readers discover advance copies, publishers submit books for approval, and administrators moderate titles and view activity.

## Run locally

Prerequisites: Node.js 20 or newer and MongoDB running locally on port 27017. The app connects directly to `mongodb://127.0.0.1:27017/book_review_portal`; MongoDB creates the database on first write. No `.env` file is required.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. On first run, open `http://localhost:3000/setup-admin` to create the one administrator account. The page is disabled after an admin has been created. Readers and publishers can register from the site.

With the app and MongoDB running, `npm run test:roles` exercises the three roles and core workflows using temporary accounts and removes its test data afterward. Run it only when the one-time administrator has not already been created, because the test exercises the first-admin setup flow.

## MVC structure

- `models/`: Mongoose schemas for users, books, reviews, forum posts and feedback.
- `views/`: EJS pages and shared layout partials.
- `controllers/`: request handling and business rules.
- `routes/`: web routes and REST API routes.
- `middleware/`: role checks and CSRF protection.
- `config/database.js`: local MongoDB connection.

## Main workflows

- Readers register, choose optional interests, search published books, rate and review them, join book discussions, send private publisher feedback, and change or recover a password.
- Publishers register, submit advance copies, preview their own submissions, and track review status. Pending or rejected books can be edited through the API.
- The first administrator is created once at `/setup-admin`. Admins can approve or reject books, inspect users and publishers, view reader feedback, and see category-level book and rating analysis.
- Public book listings only include approved titles. Passwords are bcrypt-hashed, account and sign-in forms are rate-limited, sessions are stored in MongoDB, role checks protect privileged operations, and state-changing requests require a session CSRF token.

## REST API

All request and response bodies use JSON. Authentication uses the same session cookie as the web app. Before `POST`, `PATCH`, `PUT` or `DELETE`, fetch `GET /api/csrf-token` and send its `csrfToken` as the `x-csrf-token` header.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/csrf-token` | Public |
| POST | `/api/auth/register` | Public, rate-limited |
| POST | `/api/auth/login` | Public, rate-limited |
| POST | `/api/auth/forgot-password` | Public, rate-limited; verifies user ID, ZIP code and mobile, then sets a new password |
| POST | `/api/auth/change-password` | Signed in |
| POST | `/api/auth/logout` | Signed in |
| GET | `/api/books?search=&category=` | Public |
| GET | `/api/books/categories` | Public |
| GET | `/api/books/:id` | Public, published books only |
| POST | `/api/books` | Publisher |
| GET | `/api/publisher/books` | Publisher |
| PATCH | `/api/publisher/books/:id` | Owner, pending or rejected books |
| POST | `/api/books/:id/reviews` | Reader, one review per book |
| GET / POST | `/api/books/:id/forum` | Public read / reader write |
| POST | `/api/books/:id/feedback` | Reader |
| GET | `/api/admin/users` | Admin |
| GET | `/api/admin/feedback` | Admin |
| GET | `/api/admin/analysis` | Admin |
| PATCH | `/api/admin/books/:id` | Admin, body `{ "status": "published" }` or `{ "status": "rejected" }` |

## Before deployment

This project is configured for local development, not yet deployed to Azure. Before exposing it publicly, set a strong `SESSION_SECRET` environment variable, set `NODE_ENV=production`, and use a secured MongoDB connection string. Production mode requires `SESSION_SECRET` and enables secure cookies. The requested Azure portal link requires an Azure subscription and deployment credentials, which are not available in this workspace.