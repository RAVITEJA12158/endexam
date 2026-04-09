# Expense Tracker — Backend API

A full-featured Personal & Shared Expense Tracker REST API built with **Node.js**, **Express**, **PostgreSQL**, **Prisma ORM**, and **Socket.io**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Auth | JWT (jsonwebtoken) |
| Real-time | Socket.io 4 |
| Password hashing | bcryptjs |

---

## Project Structure

```
expense-tracker-backend/
├── index.js                         # Entry point — Express + Socket.io
├── .env                             # Environment variables
├── package.json
├── prisma/
│   └── schema.prisma                # Full DB schema
└── src/
    ├── config/
    │   ├── db.js                    # Prisma client singleton
    │   └── corsOption.js            # CORS whitelist
    ├── middleware/
    │   └── authenticate.js          # JWT verification middleware
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── friend.controller.js
    │   ├── category.controller.js
    │   ├── expense.controller.js
    │   ├── sharedExpense.controller.js
    │   ├── settlement.controller.js
    │   ├── budget.controller.js
    │   ├── dashboard.controller.js
    │   ├── notification.controller.js
    │   ├── group.controller.js
    │   └── export.controller.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── friend.routes.js
    │   ├── category.routes.js
    │   ├── expense.routes.js
    │   ├── sharedExpense.routes.js
    │   ├── settlement.routes.js
    │   ├── budget.routes.js
    │   ├── dashboard.routes.js
    │   ├── notification.routes.js
    │   ├── group.routes.js
    │   └── export.routes.js
    ├── socket/
    │   └── socket.js                # Socket.io event handlers
    └── utils/
        ├── validators.js            # Input validation helpers
        ├── notifications.js         # Notification create + emit helper
        ├── budget.js                # Budget spent update + alert helper
        └── seed.js                  # Category seeder script
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Edit `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/expensetracker"
JWT_SECRET="your_super_secret_key_here"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:3000"
```

### 3. Run DB migration

```bash
npx prisma migrate dev --name init
```

### 4. Seed categories (optional — also runs on server start)

```bash
npm run db:seed
```

### 5. Start the server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

---

## API Base URL

```
http://localhost:5000/api
```

---

## Authentication

All protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

JWT payload: `{ userId, username, email }`

---

## API Endpoints

### AUTH
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login (username or email) |
| GET | `/auth/me` | ✅ | Get current user profile |
| PUT | `/auth/me` | ✅ | Update name / currency |
| PUT | `/auth/me/password` | ✅ | Change password |

### FRIENDS
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/friends` | ✅ | Get accepted friends |
| GET | `/friends/requests` | ✅ | Incoming friend requests |
| GET | `/friends/sent` | ✅ | Sent friend requests |
| GET | `/friends/search?q=` | ✅ | Search users by username/email |
| POST | `/friends/request` | ✅ | Send friend request |
| PUT | `/friends/request/:id/accept` | ✅ | Accept request |
| PUT | `/friends/request/:id/reject` | ✅ | Reject request |
| DELETE | `/friends/:friendId` | ✅ | Remove friend |

### CATEGORIES
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | ❌ | Get all 8 categories |

### EXPENSES
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/expenses` | ✅ | List expenses (filter, search, paginate) |
| GET | `/expenses/:id` | ✅ | Get single expense |
| POST | `/expenses` | ✅ | Create personal or shared expense |
| PUT | `/expenses/:id` | ✅ | Update expense |
| DELETE | `/expenses/:id` | ✅ | Delete expense |

**Query params for GET /expenses:**
- `categoryId`, `month` (1-12), `year`, `sort` (newest/oldest/amount_asc/amount_desc), `search`, `page`, `limit`

### SHARED EXPENSES
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/shared-expenses` | ✅ | All shared expenses involving user |
| GET | `/shared-expenses/:id` | ✅ | Single shared expense detail |

### SETTLEMENTS
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/settlements/owe` | ✅ | Splits where I owe money |
| GET | `/settlements/owed` | ✅ | Splits where others owe me |
| POST | `/settlements/:splitId/pay` | ✅ | Record a payment (partial or full) |
| POST | `/settlements/:splitId/mark-paid` | ✅ | Creditor marks split as paid externally |

### BUDGETS
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/budgets` | ✅ | Get budgets (month/year params) |
| POST | `/budgets` | ✅ | Create or update a budget (upsert) |
| DELETE | `/budgets/:id` | ✅ | Delete a budget |

### DASHBOARD
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/summary` | ✅ | Full analytics (charts, totals, settlements) |
| GET | `/dashboard/recent-transactions` | ✅ | Last 5 transactions |

### NOTIFICATIONS
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✅ | List notifications (unreadOnly, paginate) |
| PUT | `/notifications/read-all` | ✅ | Mark all as read |
| PUT | `/notifications/:id/read` | ✅ | Mark one as read |

### GROUPS & CHAT
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/groups` | ✅ | All groups user belongs to |
| GET | `/groups/:groupId/messages` | ✅ | Chat messages for a group |
| POST | `/groups/:groupId/messages` | ✅ | Send a message |

### EXPORT
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/export/csv` | ✅ | Download CSV of all expenses + settlements |

---

## WebSocket Events (Socket.io)

### Connection
```js
// Client connects with JWT
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
```

Server automatically joins:
- `user:<userId>` — personal room
- `group:<groupId>` — for each group the user belongs to

### Server → Client Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `settlement:updated` | `{ splitId, paidAmount, status, fromUser }` | Someone pays their split |
| `notification:new` | `{ notification }` | Any new notification |
| `group:message` | `{ message, user, groupId }` | New chat message in a group |
| `expense:shared_created` | `{ sharedExpense, splits }` | Added to a new shared expense |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `group:join` | `{ groupId }` | Join a specific group room |
| `group:message` | `{ groupId, message, expenseId? }` | Send a chat message |

---

## Business Logic Notes

### Expense Creation (Shared)
- Payer's split is auto-set to `status=PAID`, `paidAmount=owedAmount`
- A `Group` is auto-created with the expense title as name
- All split users are added as `GroupMember`
- Budget check runs for payer's category
- `SPLIT_CREATED` notification sent to each non-payer

### Budget Alerts
- Warning at **80%** usage → `BUDGET_WARNING` notification
- Exceeded at **100%** → `BUDGET_EXCEEDED` notification
- For shared expenses: only payer's own share counts toward their budget
- For settlement payments: the payer's amount counts toward their budget

### Settlement Flow
1. User A pays full bill → shared expense created, A's split = PAID
2. User B (owes A) → calls `POST /settlements/:splitId/pay`
3. Partial payments allowed; status = `PARTIALLY_PAID` until fully paid
4. A can also call `POST /settlements/:splitId/mark-paid` for external payments
5. Real-time: `settlement:updated` emitted to A's socket room
6. Notification: `PAYMENT_RECEIVED` created for A

---

## Error Response Format

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (not owner) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 500 | Internal server error |

---

## Prisma Schema Models

| Model | Description |
|-------|-------------|
| `User` | Registered user with currency preference |
| `Friendship` | Friend requests (PENDING → ACCEPTED/REJECTED) |
| `Category` | 8 fixed expense categories |
| `Expense` | Personal or shared expense |
| `SharedExpense` | Shared expense metadata (payer, group) |
| `ExpenseSplit` | Per-user split with owed/paid amounts |
| `Transaction` | Central ledger (EXPENSE or PAYMENT type) |
| `Group` | Auto-created group per shared expense |
| `GroupMember` | User ↔ Group junction table |
| `GroupMessage` | Real-time group chat messages |
| `Budget` | Monthly category budget with spent tracking |
| `Notification` | Persistent notifications with socket delivery |
