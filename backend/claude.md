CLAUDE.md — Expense Tracker Backend API Contract
Updated Prisma Schema Additions
Add these models/fields to the existing schema:
```prisma
// Add to User model:
username  String   @unique
currency  String   @default("INR")

// Add to SharedExpense model:
paidById  String
paidBy    User     @relation("paidExpenses", fields: [paidById], references: [id])
title     String

// Add to Group model:
createdById String
createdBy   User     @relation(fields: [createdById], references: [id])
members     GroupMember[]

// New model: GroupMember
model GroupMember {
  id        String   @id @default(cuid())
  groupId   String
  userId    String
  group     Group    @relation(fields: [groupId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
}

// New model: Notification
model Notification {
  id        String   @id @default(cuid())
  userId    String                          // recipient
  user      User     @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  body      String
  data      Json?                           // arbitrary payload (splitId, expenseId, etc.)
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([isRead])
}

enum NotificationType {
  FRIEND_REQUEST
  FRIEND_ACCEPTED
  SPLIT_CREATED        // you were added to a split
  PAYMENT_RECEIVED     // someone settled their debt to you
  BUDGET_WARNING       // 80% threshold crossed
  BUDGET_EXCEEDED      // 100% exceeded
}
```
---
Base URL
```
http://localhost:5000/api
```
Authentication
All protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```
JWT payload: `{ userId, username, email }`
---
WebSocket Events (Socket.io)
Connection
```
Client connects with: { token: JWT }
Server joins user to room: `user:<userId>`
Server joins user to group rooms: `group:<groupId>` for each group they belong to
```
Events — Server → Client
Event	Payload	Trigger
`settlement:updated`	`{ splitId, paidAmount, status, fromUser }`	When someone pays their split
`notification:new`	`{ notification }`	Any new notification created
`group:message`	`{ message, user, groupId }`	New group chat message
`expense:shared_created`	`{ sharedExpense, splits }`	When user is added to a new shared expense
Events — Client → Server
Event	Payload
`group:join`	`{ groupId }`
`group:message`	`{ groupId, message, expenseId? }`
---
1. AUTH ENDPOINTS
POST /auth/register
Register a new user.
```json
Request:
{
  "fullName": "string",
  "username": "string",       // unique, alphanumeric + underscore
  "email": "string",
  "password": "string",       // min 8 chars, 1 upper, 1 special
  "confirmPassword": "string",
  "currency": "string"        // e.g. "INR", "USD"
}

Response 201:
{
  "token": "JWT",
  "user": { "id", "username", "email", "fullName", "currency" }
}

Errors:
400 - Validation failed (password mismatch, weak password, etc.)
409 - Username or email already exists
```
POST /auth/login
Login with username or email.
```json
Request:
{
  "identifier": "string",     // username OR email
  "password": "string"
}

Response 200:
{
  "token": "JWT",
  "user": { "id", "username", "email", "name", "currency" }
}

Errors:
401 - Invalid credentials
```
GET /auth/me  🔒
Get current logged-in user profile.
```json
Response 200:
{
  "id", "username", "name", "email", "currency", "createdAt"
}
```
PUT /auth/me  🔒
Update profile (name, currency).
```json
Request:
{
  "name": "string",
  "currency": "string"
}
Response 200: { updated user }
```
PUT /auth/me/password  🔒
Change password.
```json
Request:
{
  "currentPassword": "string",
  "newPassword": "string"
}
Response 200: { "message": "Password updated" }
```
---
2. FRIENDS ENDPOINTS
GET /friends  🔒
Get all accepted friends.
```json
Response 200:
{
  "friends": [
    { "id", "username", "name", "email" }
  ]
}
```
GET /friends/requests  🔒
Get pending incoming friend requests.
```json
Response 200:
{
  "requests": [
    { "id": "friendshipId", "sender": { "id", "username", "name" }, "createdAt" }
  ]
}
```
GET /friends/sent  🔒
Get sent (pending) friend requests.
```json
Response 200:
{
  "sent": [
    { "id": "friendshipId", "receiver": { "id", "username", "name" }, "createdAt" }
  ]
}
```
POST /friends/request  🔒
Send a friend request by username or email.
```json
Request:
{
  "identifier": "string"      // username or email of target user
}

Response 201: { "message": "Friend request sent", "friendship": {...} }

Errors:
404 - User not found
409 - Request already sent or already friends
400 - Cannot send request to yourself
```
PUT /friends/request/:friendshipId/accept  🔒
Accept a friend request.
```json
Response 200: { "message": "Friend request accepted" }
Errors: 404 - Request not found, 403 - Not the recipient
```
PUT /friends/request/:friendshipId/reject  🔒
Reject (delete) a friend request.
```json
Response 200: { "message": "Request rejected" }
```
DELETE /friends/:friendId  🔒
Remove a friend.
```json
Response 200: { "message": "Friend removed" }
```
GET /friends/search?q=  🔒
Search registered users by username or email (for adding friends).
```json
Response 200:
{
  "users": [
    { "id", "username", "name", "email", "isFriend": bool, "requestSent": bool }
  ]
}
```
---
3. CATEGORIES ENDPOINTS
GET /categories
Get all 8 categories (public, no auth needed).
```json
Response 200:
{
  "categories": [
    { "id", "name" }
  ]
}
```
Seed these on startup: Food, Transport, Shopping, Education, Entertainment, Health & Medical, Utilities, Others
---
4. EXPENSE ENDPOINTS
GET /expenses  🔒
Get all personal expenses of logged-in user.
```json
Query params:
  categoryId  - filter by category
  month       - filter by month (1-12)
  year        - filter by year (e.g. 2024)
  sort        - "newest" | "oldest" | "amount_asc" | "amount_desc"  (default: newest)
  search      - search in title or notes
  page        - page number (default: 1)
  limit       - items per page (default: 20)

Response 200:
{
  "expenses": [
    {
      "id", "title", "amount", "notes", "type", "paymentMode",
      "createdAt", "updatedAt",
      "category": { "id", "name" },
      "sharedExpense": {           // null if personal
        "id", "groupId",
        "splits": [{ "userId", "owedAmount", "status" }]
      }
    }
  ],
  "total": 120,
  "page": 1,
  "totalPages": 6
}
```
GET /expenses/:id  🔒
Get single expense detail.
```json
Response 200: { full expense object with category, sharedExpense.splits.user }
```
POST /expenses  🔒
Create a personal or shared expense.
```json
Request:
{
  "title": "string",           // max 80 chars
  "amount": 500.00,
  "categoryId": "string",
  "date": "2024-01-15",        // ISO date, defaults to today
  "paymentMode": "CASH|UPI|CREDIT_CARD|DEBIT_CARD|NET_BANKING",
  "notes": "string",           // optional, max 200 chars
  "isShared": false,
  // if isShared = true:
  "splits": [
    {
      "userId": "string",      // must be a friend
      "owedAmount": 150.00     // exact amount for this user's share
    }
  ]
  // splits must include the payer themselves
  // sum of all owedAmounts must equal expense.amount
}

Response 201:
{
  "expense": { ...full expense },
  // if shared:
  "group": { "id", "name" },
  "splits": [ { "id", "userId", "owedAmount", "status" } ]
}

Side effects:
- If isShared: auto-create Group (name = expense title), add all split users as GroupMembers
- Create Transaction record (type=EXPENSE) for the payer
- Check budget threshold → create BUDGET_WARNING or BUDGET_EXCEEDED notification if applicable
- If shared: create SPLIT_CREATED notification for each non-payer split member
- Payer's own split: status=PAID, paidAmount=owedAmount immediately
- Update Budget.spentAmount for payer's category

Errors:
400 - Validation error, split amounts don't sum to total, user not a friend
```
PUT /expenses/:id  🔒
Update a personal expense (only if no settlements have been made yet on shared).
```json
Request: same fields as POST (partial update ok)
Response 200: { updated expense }
Errors: 403 - Not owner, 400 - Cannot edit shared expense with existing payments
```
DELETE /expenses/:id  🔒
Delete an expense.
```json
Response 200: { "message": "Expense deleted" }
Errors: 403 - Not owner, 400 - Cannot delete shared expense with existing payments
```
---
5. SHARED EXPENSES & SETTLEMENTS
GET /shared-expenses  🔒
Get all shared expenses involving the logged-in user (as payer or splittee).
```json
Response 200:
{
  "sharedExpenses": [
    {
      "id", "title", "createdAt",
      "expense": { "id", "title", "amount", "paymentMode", "category" },
      "group": { "id", "name" },
      "paidBy": { "id", "username", "name" },
      "splits": [
        {
          "id", "owedAmount", "paidAmount", "status",
          "user": { "id", "username", "name" }
        }
      ],
      "mySpilt": { "id", "owedAmount", "paidAmount", "status" }  // current user's split
    }
  ]
}
```
GET /shared-expenses/:id  🔒
Get single shared expense detail with full splits and transaction history.
```json
Response 200: { full shared expense, splits with user info, transactions }
```
GET /settlements/owe  🔒
Get all splits where logged-in user owes money (status != PAID, user != paidBy).
```json
Response 200:
{
  "settlements": [
    {
      "splitId", "owedAmount", "paidAmount", "remainingAmount", "status",
      "sharedExpense": { "id", "title" },
      "owedTo": { "id", "username", "name" }    // the paidBy user
    }
  ],
  "totalOwed": 1250.00
}
```
GET /settlements/owed  🔒
Get all splits where others owe money to logged-in user.
```json
Response 200:
{
  "settlements": [
    {
      "splitId", "owedAmount", "paidAmount", "remainingAmount", "status",
      "sharedExpense": { "id", "title" },
      "owedBy": { "id", "username", "name" }
    }
  ],
  "totalOwed": 800.00
}
```
POST /settlements/:splitId/pay  🔒
Record a repayment on a split (partial or full). Only the split owner can call this.
```json
Request:
{
  "amount": 150.00,    // must be > 0 and <= remaining amount
  "mode": "CASH|UPI|CREDIT_CARD|DEBIT_CARD|NET_BANKING"
}

Response 200:
{
  "split": { "id", "owedAmount", "paidAmount", "status" },
  "transaction": { "id", "amount", "type": "PAYMENT" }
}

Side effects:
- Create Transaction (type=PAYMENT, splitId, userId=current user)
- Update ExpenseSplit.paidAmount += amount
- If paidAmount >= owedAmount: set status=PAID
- Else if paidAmount > 0: set status=PARTIALLY_PAID
- Create PAYMENT_RECEIVED notification for the paidBy user
- Emit settlement:updated socket event to paidBy user's room
- Update Budget.spentAmount for the paying user's relevant category

Errors:
400 - Amount exceeds remaining, 403 - Not split owner
```
POST /settlements/:splitId/mark-paid  🔒
Mark a split as paid externally (called by the creditor, i.e. paidBy user).
```json
Request: {}  // no body needed
Response 200: { split with status=PAID }
Side effects: same notifications + socket events as /pay
```
---
6. BUDGET ENDPOINTS
GET /budgets  🔒
Get all budgets for the logged-in user (current month by default).
```json
Query params:
  month  - 1-12
  year   - e.g. 2024

Response 200:
{
  "budgets": [
    {
      "id", "limitAmount", "spentAmount", "month", "year",
      "category": { "id", "name" },
      "percentUsed": 72.5,
      "remaining": 275.00,
      "status": "ok" | "warning" | "exceeded"
    }
  ]
}
```
POST /budgets  🔒
Set or update a budget for a category + month.
```json
Request:
{
  "categoryId": "string",
  "limitAmount": 5000.00,
  "month": 1,              // 1-12
  "year": 2024
}

Response 201: { budget }
Note: if budget already exists for that category+month+user, upsert (update limitAmount)
```
DELETE /budgets/:id  🔒
Delete a budget.
```json
Response 200: { "message": "Budget deleted" }
```
---
7. DASHBOARD ENDPOINTS
GET /dashboard/summary  🔒
Main dashboard analytics.
```json
Response 200:
{
  "currentMonth": {
    "totalExpenses": 12500.00,
    "transactionCount": 34,
    "highestCategory": { "name": "Food", "amount": 4500.00 },
    "byCategory": [
      { "categoryId", "categoryName", "total": 4500.00 }
    ]
  },
  "currentYear": {
    "totalExpenses": 85000.00
  },
  "last6Months": [
    { "month": 1, "year": 2024, "monthName": "Jan", "total": 9800.00 }
  ],
  "dailyThisMonth": [
    { "date": "2024-01-01", "total": 450.00 }
  ],
  "settlements": {
    "totalOwe": 1250.00,
    "totalOwed": 800.00,
    "netBalance": -450.00       // negative = you owe more
  }
}
```
GET /dashboard/recent-transactions  🔒
Last 5 expenses (personal + shared).
```json
Response 200:
{
  "transactions": [
    {
      "id", "title", "amount", "createdAt",
      "category": { "name" },
      "isShared": bool,
      "type": "EXPENSE" | "PAYMENT"
    }
  ]
}
```
---
8. NOTIFICATIONS ENDPOINTS
GET /notifications  🔒
Get all notifications for the logged-in user.
```json
Query params:
  unreadOnly  - "true" | "false"
  page, limit

Response 200:
{
  "notifications": [
    { "id", "type", "title", "body", "data", "isRead", "createdAt" }
  ],
  "unreadCount": 3
}
```
PUT /notifications/:id/read  🔒
Mark a notification as read.
```json
Response 200: { notification }
```
PUT /notifications/read-all  🔒
Mark all notifications as read.
```json
Response 200: { "message": "All marked read" }
```
---
9. GROUP CHAT ENDPOINTS
GET /groups  🔒
Get all groups the user belongs to.
```json
Response 200:
{
  "groups": [
    {
      "id", "name", "createdAt",
      "members": [{ "id", "username", "name" }],
      "lastMessage": { "message", "user", "createdAt" }
    }
  ]
}
```
GET /groups/:groupId/messages  🔒
Get chat messages for a group.
```json
Query params: page, limit (default 50)

Response 200:
{
  "messages": [
    {
      "id", "message", "expenseId", "createdAt",
      "user": { "id", "username", "name" }
    }
  ]
}
```
POST /groups/:groupId/messages  🔒
Send a message to a group.
```json
Request:
{
  "message": "string",     // optional if expenseId given
  "expenseId": "string"    // optional — attach expense reference
}

Response 201: { message object }
Side effects: emit group:message socket event to group room
```
---
10. EXPORT ENDPOINT
GET /export/csv  🔒
Export all personal + shared expenses + settlements to CSV.
```json
Query params:
  month  - optional filter
  year   - optional filter

Response: text/csv file download
Headers:
  Content-Type: text/csv
  Content-Disposition: attachment; filename="expenses_export_<timestamp>.csv"

CSV Columns:
Date, Title, Type (Personal/Shared), Category, Amount, PaymentMode,
YourShare, PaidAmount, Status, Notes, Group, PaidBy
```
---
Error Response Format (all endpoints)
```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE",    // optional
  "details": {}                        // optional validation details
}
```
HTTP Status Codes Used
Code	Meaning
200	Success
201	Created
400	Bad request / validation error
401	Unauthenticated
403	Forbidden (not owner)
404	Not found
409	Conflict (duplicate)
500	Internal server error
