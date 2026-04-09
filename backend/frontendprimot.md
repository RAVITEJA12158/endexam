EXPENSE TRACKER — COMPLETE FRONTEND GENERATION PROMPT
For use with any AI code generation model
Tech: React 18, React Router v6, Tailwind CSS, Recharts, Socket.io-client, Axios
==============================================================
DESIGN SYSTEM (apply globally to every page)
==============================================================
Aesthetic Direction
Dark-first UI. Think: premium fintech app — deep charcoal backgrounds,
crisp white typography, emerald/sage green as the primary accent,
amber for warnings, rose for danger, sky blue for info.
Clean, dense, data-rich. No gradients on text. No purple. No rounded-full buttons.
Color Tokens (CSS variables in index.css)
--bg-base:       #0F1117   (page background)
--bg-card:       #181B24   (card backgrounds)
--bg-elevated:   #1F2330   (inputs, dropdowns, modals)
--bg-hover:      #252A38   (hover states)
--border:        #2C3140   (all borders)
--border-focus:  #4A9B7F   (focused input border)
--text-primary:  #F0F2F7   (headings, important values)
--text-secondary:#9BA3B2   (labels, placeholders)
--text-muted:    #5A6173   (disabled, hints)
--accent:        #4A9B7F   (primary green — buttons, active states)
--accent-hover:  #3D8A6F
--accent-glow:   rgba(74,155,127,0.15)
--warn:          #E8A838   (budget warnings, pending)
--danger:        #D95C5C   (errors, delete, exceeded)
--success:       #5BAD7F   (paid, completed)
--info:          #4A8FD4   (shared expense indicator)
Typography (Google Fonts — import in index.html)
Display/Headings: "Syne" (weights 600, 700, 800)
Body: "Inter" (weights 400, 500, 600)
Numbers/Amounts: "JetBrains Mono" (weight 500)
Spacing & Radius
Cards: rounded-xl, border border-[--border], bg-[--bg-card]
Inputs: rounded-lg, bg-[--bg-elevated], border border-[--border]
Buttons: rounded-lg (never rounded-full)
Page padding: px-6 py-6 (mobile: px-4 py-4)
Card padding: p-5 (compact: p-4)
Button Variants
Primary:   bg-[--accent] text-white hover:bg-[--accent-hover] px-4 py-2 rounded-lg font-medium text-sm
Secondary: bg-[--bg-elevated] border border-[--border] text-[--text-primary] hover:bg-[--bg-hover]
Danger:    bg-[--danger]/10 border border-[--danger]/30 text-[--danger] hover:bg-[--danger]/20
Ghost:     text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]
Form Inputs (all inputs share this base style)
className: "w-full bg-[--bg-elevated] border border-[--border] rounded-lg px-3 py-2
text-[--text-primary] text-sm placeholder:text-[--text-muted]
focus:outline-none focus:border-[--border-focus] focus:ring-1
focus:ring-[--accent]/30 transition-colors"
Amount Display
Always use font-mono (JetBrains Mono) for rupee/currency amounts.
Format: ₹ 1,234.50 (use Indian locale formatting when currency=INR)
Color coding: positive/credit = text-[--success], negative/debit = text-[--danger], neutral = text-[--text-primary]
Status Badges
PAID:            bg-[--success]/10 text-[--success] border border-[--success]/20
PARTIALLY_PAID:  bg-[--warn]/10    text-[--warn]    border border-[--warn]/20
PENDING:         bg-[--danger]/10  text-[--danger]  border border-[--danger]/20
SHARED indicator:bg-[--info]/10    text-[--info]    border border-[--info]/20
Chart Colors (Recharts)
categoryColors array: ["#4A9B7F","#4A8FD4","#E8A838","#D95C5C","#9B6ED4","#5BAD7F","#D4A84A","#6B8EC4"]
Chart background: transparent
Grid lines: stroke="#2C3140"
Tooltip: bg-[--bg-elevated] border border-[--border] rounded-lg
Toast Notifications (react-hot-toast)
position: "top-right"
Custom styles: dark background matching --bg-elevated, colored left border per type
==============================================================
PROJECT STRUCTURE
==============================================================
src/
├── api/
│   ├── axios.js           (axios instance with baseURL + JWT interceptor)
│   ├── auth.js
│   ├── expenses.js
│   ├── shared.js
│   ├── settlements.js
│   ├── friends.js
│   ├── budgets.js
│   ├── dashboard.js
│   ├── notifications.js
│   ├── groups.js
│   └── export.js
├── context/
│   ├── AuthContext.jsx     (user state, login/logout, token)
│   ├── SocketContext.jsx   (socket.io connection, event listeners)
│   └── NotificationContext.jsx (unread count, notification list)
├── hooks/
│   ├── useAuth.js
│   ├── useSocket.js
│   ├── useNotifications.js
│   └── useCurrency.js      (format amounts by user currency pref)
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx   (sidebar + topbar wrapper for authenticated pages)
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Badge.jsx
│   │   ├── Card.jsx
│   │   ├── Spinner.jsx
│   │   ├── EmptyState.jsx
│   │   ├── ProgressBar.jsx
│   │   └── Avatar.jsx
│   ├── charts/
│   │   ├── ExpensePieChart.jsx
│   │   ├── MonthlyBarChart.jsx
│   │   └── DailyLineChart.jsx
│   └── shared/
│       ├── ExpenseCard.jsx
│       ├── SplitBadge.jsx
│       ├── SettlementRow.jsx
│       ├── NotificationPanel.jsx
│       └── FriendSearchInput.jsx
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── dashboard/
│   │   └── DashboardPage.jsx
│   ├── expenses/
│   │   ├── ExpensesPage.jsx        (list + filters)
│   │   ├── AddExpensePage.jsx      (add/edit form)
│   │   └── ExpenseDetailPage.jsx
│   ├── settlements/
│   │   └── SettlementsPage.jsx
│   ├── friends/
│   │   └── FriendsPage.jsx
│   ├── budget/
│   │   └── BudgetPage.jsx
│   ├── groups/
│   │   └── GroupChatPage.jsx
│   └── export/
│       └── ExportPage.jsx
├── utils/
│   ├── formatCurrency.js
│   ├── formatDate.js
│   └── constants.js        (CATEGORIES, PAYMENT_MODES, etc.)
├── App.jsx
├── index.jsx
└── index.css
==============================================================
API LAYER (src/api/)
==============================================================
axios.js
Create axios instance: baseURL = "http://localhost:5000/api"
Request interceptor: read token from localStorage("token"), add as Authorization: Bearer <token>
Response interceptor: if 401, clear localStorage and redirect to /login
Export instance as `api`
auth.js
export const register = (data) => api.post("/auth/register", data)
export const login    = (data) => api.post("/auth/login", data)
export const getMe    = ()     => api.get("/auth/me")
export const updateMe = (data) => api.put("/auth/me", data)
export const changePassword = (data) => api.put("/auth/me/password", data)
expenses.js
export const getExpenses    = (params) => api.get("/expenses", { params })
export const getExpense     = (id)     => api.get(`/expenses/${id}`)
export const createExpense  = (data)   => api.post("/expenses", data)
export const updateExpense  = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense  = (id)     => api.delete(`/expenses/${id}`)
shared.js
export const getSharedExpenses  = ()   => api.get("/shared-expenses")
export const getSharedExpense   = (id) => api.get(`/shared-expenses/${id}`)
settlements.js
export const getOwed         = ()              => api.get("/settlements/owe")
export const getOwedToMe     = ()              => api.get("/settlements/owed")
export const paySettlement   = (splitId, data) => api.post(`/settlements/${splitId}/pay`, data)
export const markPaid        = (splitId)       => api.post(`/settlements/${splitId}/mark-paid`)
friends.js
export const getFriends        = ()           => api.get("/friends")
export const getRequests       = ()           => api.get("/friends/requests")
export const getSent           = ()           => api.get("/friends/sent")
export const sendRequest       = (identifier) => api.post("/friends/request", { identifier })
export const acceptRequest     = (id)         => api.put(`/friends/request/${id}/accept`)
export const rejectRequest     = (id)         => api.put(`/friends/request/${id}/reject`)
export const removeFriend      = (id)         => api.delete(`/friends/${id}`)
export const searchUsers       = (q)          => api.get("/friends/search", { params: { q } })
budgets.js
export const getBudgets    = (params) => api.get("/budgets", { params })
export const createBudget  = (data)   => api.post("/budgets", data)
export const deleteBudget  = (id)     => api.delete(`/budgets/${id}`)
dashboard.js
export const getSummary      = () => api.get("/dashboard/summary")
export const getRecentTxns   = () => api.get("/dashboard/recent-transactions")
notifications.js
export const getNotifications = (params) => api.get("/notifications", { params })
export const markRead         = (id)     => api.put(`/notifications/${id}/read`)
export const markAllRead      = ()       => api.put("/notifications/read-all")
groups.js
export const getGroups    = ()              => api.get("/groups")
export const getMessages  = (groupId, params) => api.get(`/groups/${groupId}/messages`, { params })
export const sendMessage  = (groupId, data)   => api.post(`/groups/${groupId}/messages`, data)
export.js
export const exportCSV = (params) => api.get("/export/csv", { params, responseType: "blob" })
==============================================================
CONTEXT LAYER
==============================================================
AuthContext.jsx
State: { user, token, isAuthenticated, isLoading }
On mount: read token from localStorage, call getMe(), set user
login(token, user): save to state + localStorage
logout(): clear state + localStorage, navigate to /login
Provide: { user, isAuthenticated, isLoading, login, logout, updateUser }
SocketContext.jsx
Connect to "http://localhost:5000" with { auth: { token } } on mount (only if authenticated)
On connect: socket joins user room automatically (server side)
Listen for: settlement:updated, notification:new, group:message, expense:shared_created
On settlement:updated: trigger a custom event / callback so SettlementsPage can refetch
On notification:new: call NotificationContext.addNotification()
Disconnect on logout
Provide: { socket, isConnected, onSettlementUpdate, emitGroupMessage }
NotificationContext.jsx
State: { notifications, unreadCount }
On mount: fetch from GET /notifications?unreadOnly=false
addNotification(n): prepend to list, increment unreadCount
markAsRead(id): call API, update local state
markAllRead(): call API, reset unreadCount to 0
Provide: { notifications, unreadCount, addNotification, markAsRead, markAllRead }
==============================================================
LAYOUT COMPONENTS
==============================================================
AppLayout.jsx
Wrapper for all authenticated pages
Renders: <Sidebar /> on left (w-64 on desktop, drawer on mobile)
Renders: <Topbar /> at top
Children render in main content area (flex-1, overflow-y-auto)
Protect route: if !isAuthenticated, redirect to /login
Sidebar.jsx
Fixed left sidebar (w-64), bg-[--bg-card], border-r border-[--border]
Top section: App logo + name "SpendSplit" in Syne font
Navigation links (use lucide-react icons):
Dashboard        /dashboard           (LayoutDashboard icon)
Expenses         /expenses            (Receipt icon)
Add Expense      /expenses/add        (PlusCircle icon) — highlighted differently
Shared Expenses  /shared-expenses     (Users icon)
Settlements      /settlements         (ArrowLeftRight icon)
Budgets          /budget              (PieChart icon)
Friends          /friends             (UserPlus icon) — show pending request count badge
Groups / Chat    /groups              (MessageSquare icon)
Export           /export              (Download icon)
Active link: bg-[--accent-glow] text-[--accent] border-l-2 border-[--accent]
Inactive link: text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover]
Bottom section: user avatar, name, currency, logout button
Topbar.jsx
Fixed top bar, bg-[--bg-card]/80 backdrop-blur, border-b border-[--border]
Left: Page title (dynamic per route)
Right:
Notification bell icon with unreadCount badge (opens NotificationPanel)
Currency display (user.currency)
User avatar + name
==============================================================
PAGE SPECIFICATIONS
==============================================================
---
PAGE 1: LoginPage.jsx (/login)
---
LAYOUT: Full screen centered, bg-[--bg-base]
Left half (desktop): decorative panel with app name "SpendSplit", tagline,
and a subtle abstract visualization (SVG pattern or mesh gradient)
Right half: login form card
FORM FIELDS:
Identifier input — label "Username or Email", placeholder "Enter username or email"
Password input — label "Password", type="password", with show/hide toggle (Eye icon)
Submit button — "Sign In" — full width, primary variant
Link below: "Don't have an account? Register" → /register
VALIDATION (client-side, show inline errors below each field):
Identifier: required
Password: required
ON SUBMIT:
Call login(data)
On success: save token + user via AuthContext.login(), navigate to /dashboard
On error 401: show "Invalid credentials" below form
Show loading spinner on button while pending
---
PAGE 2: RegisterPage.jsx (/register)
---
LAYOUT: Same split layout as login
FORM FIELDS (in order):
Full Name — text, max 100 chars
Username — text, lowercase enforced, alphanumeric + underscore only
Show live availability indicator: typing debounce 500ms, call GET /friends/search?q=username
Show green checkmark if available, red X if taken
Email — email input
Currency Preference — select dropdown:
Options: INR (₹), USD ($), EUR (€), GBP (£), JPY (¥)
Default: INR
Password — with strength meter below (weak/medium/strong based on length + chars)
Requirements tooltip: 8+ chars, 1 uppercase, 1 special character
Confirm Password — with match indicator
VALIDATION:
All required
Username: alphanumeric + underscore, 3-30 chars
Email: valid format
Password: min 8 chars, at least 1 uppercase, 1 special character (!@#$%^&*)
Confirm Password: must match password
Show field-level error messages
ON SUBMIT:
Call register(data) — omit confirmPassword from payload
On success: AuthContext.login(token, user), navigate to /dashboard
On 409: show "Username already taken" or "Email already registered" near respective field
---
PAGE 3: DashboardPage.jsx (/dashboard)
---
LAYOUT: Main content area, no inner scroll — use grid layout
TOP ROW — Summary Cards (4 cards, grid-cols-4 on desktop, grid-cols-2 on tablet)
Each card: bg-[--bg-card] rounded-xl p-5 border border-[--border]
Card 1 — This Month's Spending
Label: "Total This Month"
Value: large font-mono amount (₹12,500)
Subtext: current month name + year
Icon: TrendingUp (lucide)
Card 2 — This Year's Spending
Label: "Total This Year"
Value: font-mono amount
Icon: Calendar
Card 3 — Transactions
Label: "Transactions"
Value: count (e.g. "34")
Subtext: "this month"
Icon: Receipt
Card 4 — Top Category
Label: "Highest Category"
Value: category name (e.g. "Food")
Subtext: amount spent
Icon: Fire / Zap (lucide)
SETTLEMENT SUMMARY ROW (3 cards, grid-cols-3)
Card 1 — You Owe:     amount in red  (ArrowUpRight icon)
Card 2 — Owed to You: amount in green (ArrowDownLeft icon)
Card 3 — Net Balance: computed, colored by sign
CHARTS ROW (grid-cols-3, chart spans 2 cols, pie spans 1 col)
Left (col-span-2):
Two tabs: "Monthly Overview" | "Daily Spending"
Monthly tab: MonthlyBarChart — last 6 months bar chart
X axis: month names, Y axis: amounts, bars colored --accent
Daily tab: DailyLineChart — daily totals for current month
Smooth line chart, area fill below line with opacity
Right (col-span-1):
ExpensePieChart — pie/donut chart of current month by category
Legend below chart: category name + amount + percentage
RECENT TRANSACTIONS (below charts, full width)
Header: "Recent Transactions" + "View All →" link to /expenses
List of last 5 transactions as rows:
Each row:
- Category color dot
- Expense title (truncate at 40 chars)
- SHARED badge if isShared (info color)
- Category name (muted text)
- Date (relative: "2 days ago" using date-fns)
- Amount (font-mono, color by type — expense=danger, payment=success)
Empty state: "No transactions yet"
DATA FETCHING:
getSummary() + getRecentTxns() on mount
Refresh settlements section when socket receives settlement:updated
Show skeleton loaders while fetching
---
PAGE 4: ExpensesPage.jsx (/expenses)
---
PURPOSE: Full paginated list of user's personal + shared expenses with filters
LAYOUT: Full page, no sidebar scroll interference
FILTER BAR (sticky below topbar):
Row 1 (flex, gap-3):
Search input (magnifier icon prefix) — searches title + notes
Category dropdown (multi-select) — all 8 categories
Month picker (1–12 as select)
Year picker (2022–current)
Sort select: Newest, Oldest, Highest Amount, Lowest Amount
Clear filters button (ghost, show only when filters are active)
EXPENSES LIST:
Table layout (desktop) / Card layout (mobile)
Desktop table columns:
Date | Title | Category | Type | Amount | Payment | Status | Actions
Each row:
Date: formatted "Jan 15, 2024"
Title: text (max shown 50 chars), if shared show blue SHARED pill
Category: colored dot + name
Type: PERSONAL or SHARED badge
Amount: font-mono
Payment mode: icon + text (Cash/UPI/etc.)
Status (for shared only): PENDING/PARTIALLY_PAID/PAID badge
Actions: Edit icon (pencil), Delete icon (trash) — only for own personal expenses
For shared: View Details icon → /expenses/:id
PAGINATION:
Show "Showing X–Y of Z expenses"
Prev / Next buttons + page numbers (max 5 shown)
Items per page: 10 / 20 / 50 dropdown
TOP ACTION BAR:
"Add Expense" button → /expenses/add
"Export" button → /export
EMPTY STATE:
Illustration + "No expenses found" + "Add your first expense" CTA
---
PAGE 5: AddExpensePage.jsx (/expenses/add AND /expenses/:id/edit)
---
PURPOSE: Create or edit a personal/shared expense
LAYOUT: Centered narrow form (max-w-2xl), card-style
SECTION 1 — Basic Details
Field 1: Title
Input, max 80 chars
Show char counter: "23/80" bottom-right of field
Field 2: Amount
Number input, step=0.01, min=0.01
Prefix: currency symbol from user.currency
Validate: > 0, max 2 decimal places
Field 3: Category
Custom styled select dropdown
Show colored dot next to each category name
8 categories: Food, Transport, Shopping, Education,
Entertainment, Health & Medical, Utilities, Others
Field 4: Date
Date picker — defaults to today
Cannot pick future dates
Show calendar icon
Field 5: Payment Mode
Segmented button group (not dropdown) — 5 options:
Cash | UPI | Credit Card | Debit Card | Net Banking
Active: bg-[--accent] text-white, inactive: bg-[--bg-elevated]
Field 6: Notes
Textarea, max 200 chars, 3 rows
Char counter: "0/200"
SECTION 2 — Split with Others
Toggle switch: "Split this expense with friends"
(default: OFF)
When toggled ON, reveal:
Info text: "Total: ₹X.XX — allocate shares below"
FRIEND SELECTOR:
Search input: type to search friends by name/username
Dropdown shows matched friends with avatar + username
Click to add them to the split list
SPLIT LIST (table-like):
Each added person (including yourself — auto-added as first row, labeled "You"):
- Avatar + name
- Amount input (editable, number, ≥ 0.01)
- "%" toggle to switch between amount/percent mode
- Remove button (trash icon) — disabled for "You" row
SPLIT VALIDATION:
Live sum display: "₹350 of ₹500 allocated"
Progress bar showing allocation
If sum ≠ total: show error banner "Split must equal total expense amount"
"Split Equally" quick button: divide total evenly among all participants
Minimum: at least 1 friend added when split is ON
SUBMIT BUTTON:
"Save Expense" (create) or "Update Expense" (edit)
Disabled until form is valid
Loading state on submit
ON SUCCESS:
Show success toast
Navigate to /expenses
BUDGET WARNING BANNER:
After category is selected, fetch current month's budget for that category
If (spentAmount + newAmount) > 0.8 * limitAmount:
Show yellow banner above submit: "⚠ Adding this expense will reach 85% of your Food budget"
If > 100%:
Show orange banner: "⚠ This expense will exceed your Food budget by ₹X"
---
PAGE 6: ExpenseDetailPage.jsx (/expenses/:id)
---
PURPOSE: View full details of a single expense — especially useful for shared expenses
LAYOUT: Two-column (main detail left, splits/activity right)
LEFT COLUMN:
Expense title (display font, large)
Amount (font-mono, very large, accent colored)
Meta row: Category • Date • Payment Mode
Notes section (if present)
If SHARED: "Paid by: [username]" chip
Edit / Delete buttons (only if owner + no settlements made)
RIGHT COLUMN (only for shared expenses):
Card: "Split Breakdown"
Table:
Participant | Owed | Paid | Remaining | Status
For each split:
- Avatar + name (highlight "You" row)
- owedAmount (font-mono)
- paidAmount (font-mono, green)
- remaining = owedAmount - paidAmount (red if > 0)
- Status badge
If current user has an unsettled split here:
"Pay Your Share" button → opens PayModal
Card: "Group Chat"
Show last 10 messages from the group linked to this expense
Input at bottom to send a message
Link: "Open Full Chat →" → /groups/:groupId
---
PAGE 7: SettlementsPage.jsx (/settlements)
---
PURPOSE: Manage all debts — what you owe and what others owe you
LAYOUT: Two tabs at top: "You Owe" | "Owed to You"
TAB 1 — YOU OWE:
Header: "Total You Owe: ₹1,250.00" (large, red font-mono)
List of unsettled splits where user owes money:
Each item (card style):
Left: Expense title + group name (small muted)
Middle: "Owed to [username]" + avatar
Right: Remaining amount (red font-mono)
Status badge (PENDING / PARTIALLY_PAID)
"Pay" button → opens PayModal
PAYMODAL (modal):
Title: "Settle Payment to [name] for [expense title]"
Shows: Total owed / Already paid / Remaining
Input: Amount (default = remaining, editable, cannot exceed remaining)
Payment Mode selector (same segmented buttons as expense form)
"Pay ₹X" confirm button
On submit: call paySettlement(splitId, { amount, mode })
On success: toast + update list + socket emits to creditor
TAB 2 — OWED TO YOU:
Header: "Total Owed to You: ₹800.00" (large, green font-mono)
List of splits where others owe the current user:
Each item (card):
Left: Expense title + who owes (avatar + username)
Middle: Remaining amount (green font-mono)
Right: Status badge
"Mark as Paid" button (for external payments)
ON MARK AS PAID:
Confirm dialog: "Mark [username]'s ₹X payment as received?"
Call markPaid(splitId)
Update list
Emit socket event → debtor's dashboard updates
REAL-TIME:
Socket listener for settlement:updated — when receiver gets notified,
refresh the "Owed to You" list automatically (refetch)
EMPTY STATES:
"You Owe" empty: ✓ "You're all settled up!" (green checkmark illustration)
"Owed to You" empty: "No one owes you anything right now"
---
PAGE 8: FriendsPage.jsx (/friends)
---
PURPOSE: Manage friend list, send/accept/reject requests
LAYOUT: Two columns on desktop
LEFT COLUMN — Friend Search & Requests:
SEARCH SECTION:
Label: "Add a Friend"
Input with search icon, placeholder "Search by username or email"
Debounced search (300ms) — calls GET /friends/search?q=
Dropdown results below input:
Each result: avatar (initials-based) + username + name
Button: "Add Friend" (disabled if already sent / already friends)
Show "Pending" pill if request already sent
Show "Friends" pill if already friends
INCOMING REQUESTS SECTION (below search, visible if requests.length > 0):
"Friend Requests (N)" header with count badge
Each request:
Avatar + username + name + "sent X days ago"
Accept button (green) | Decline button (red/ghost)
RIGHT COLUMN — Friends List:
Header: "Your Friends (N)"
Search/filter input within friends list
Grid of friend cards (grid-cols-2):
Each card: large initials avatar (colored by username hash), username, name
Bottom: "Remove Friend" ghost button (shows confirm on click)
Future: shared expenses in common (optional)
EMPTY STATES:
No friends: "No friends yet — search above to add some"
No requests: (section hidden)
---
PAGE 9: BudgetPage.jsx (/budget)
---
PURPOSE: Set and track monthly budgets per category
LAYOUT: Month selector at top, grid of 8 category budget cards
MONTH SELECTOR:
"< Prev" | "Month Year" | "Next >" navigation
Current month highlighted
Clicking a month loads budgets for that period
BUDGET GRID (grid-cols-2 desktop, grid-cols-1 mobile):
Each of the 8 categories gets a card:
BUDGET CARD:
Header row: Category colored icon + name | Edit/Add button (pencil icon)
If no budget set:
"No budget set" muted text
"Set Budget" button → opens BudgetModal
If budget set:
Large limit amount (font-mono)
Progress bar:
Fill color:
0–79%: --accent (green)
80–99%: --warn (amber)
100%+:  --danger (red)
Below bar: "₹spentAmount spent of ₹limitAmount"
Percentage label right-aligned: "72%"
Status pill: "On Track" / "Warning" / "Exceeded"
Edit button to change limitAmount
BUDGET MODAL:
Title: "Set Budget — [Category Name]" or "Edit Budget"
Month/Year display (non-editable, shows selected month)
Input: "Monthly Limit" (number, ₹ prefix)
Save button
SUMMARY ROW (below grid):
Total budgeted: ₹X
Total spent: ₹Y
Overall progress bar
---
PAGE 10: GroupChatPage.jsx (/groups AND /groups/:groupId)
---
PURPOSE: Real-time group chat for shared expense groups
LAYOUT: Messaging app layout — sidebar list left, chat panel right
LEFT PANEL — Group List:
"Your Groups" header
Search groups input
List of groups:
Each item:
Group name (= shared expense title)
Last message preview (truncated 40 chars)
Last message time (relative)
Unread count badge (if any — track locally)
Active group: highlighted bg-[--accent-glow] border-l-2 border-[--accent]
RIGHT PANEL — Chat Area (when group selected):
TOPBAR:
Group name (bold)
Members count: "4 members"
Members avatar stack (overlap 3 avatars + "+N")
Info icon → shows member list in popover
MESSAGE LIST (flex-col, reverse scroll from bottom):
Own messages: right-aligned, bg-[--accent]/20 rounded-xl rounded-tr-sm
Others' messages: left-aligned, bg-[--bg-elevated] rounded-xl rounded-tl-sm
Each message:
Avatar (initials) for others' messages (not repeated if consecutive)
Username (bold small) — only for others
Message text
Time (small muted) bottom-right
If message has expenseId: show linked expense chip above message
"[Receipt icon] Linked: Dinner at Hotel — ₹1,200"
Date separator chips between days: "Today" / "Yesterday" / "Jan 15"
Auto-scroll to bottom on new message
INPUT BAR (sticky bottom):
Textarea (1 row, expands up to 4), placeholder "Type a message..."
Send button (arrow icon, accent colored)
On Enter (not Shift+Enter): send message
On send: optimistically add to list, emit group:message socket event
Also POST to /groups/:groupId/messages for persistence
SOCKET:
On group:message event for active group: append to message list
For other groups: increment unread badge
EMPTY STATE (no group selected):
Centered: chat bubble illustration + "Select a group to start chatting"
---
PAGE 11: ExportPage.jsx (/export)
---
PURPOSE: Export expenses/settlements to CSV
LAYOUT: Centered card, max-w-md
CARD TITLE: "Export Data"
FILTERS:
Month select (optional): "All months" or 1–12
Year select: 2022 to current year (default: current year)
Date range display: "Exporting: Jan 2024 – Dec 2024"
WHAT'S INCLUDED (info list):
✓ All personal expenses
✓ All shared expenses you're part of
✓ Settlement records
Total records count (fetch from /expenses total field)
EXPORT BUTTON:
"Download CSV" (Download icon)
On click: call exportCSV({ month, year })
responseType: "blob"
Create object URL, trigger anchor download
filename: expenses_export_YYYY-MM-DD.csv
Show loading state on button
RECENT EXPORTS:
Last 3 exports stored in localStorage: { timestamp, filename }
List them with download unavailable note: "Previously exported files
are not stored on server — re-export if needed"
==============================================================
REUSABLE COMPONENTS
==============================================================
NotificationPanel.jsx
Drawer/popover from top-right, triggered by bell icon in Topbar
Width: w-80, max-h-96, overflow-y-auto
Header: "Notifications" + "Mark all read" button
List of notifications:
Each item:
- Icon per type (UserPlus/ArrowDownLeft/AlertTriangle/etc.)
- Title (bold)
- Body text (muted, truncate 2 lines)
- Time (relative)
- Unread: highlighted bg-[--accent-glow] border-l-2 border-[--accent]
- Click: markAsRead + navigate to relevant page per type:
FRIEND_REQUEST → /friends
PAYMENT_RECEIVED → /settlements
SPLIT_CREATED → /shared-expenses
BUDGET_WARNING/EXCEEDED → /budget
Empty: "You're all caught up 🎉"
ExpenseCard.jsx (mobile card version of expense row)
bg-[--bg-card] rounded-xl p-4 border border-[--border]
Left: category color dot + category name (small), expense title (bold)
Right: amount (font-mono), date (small muted)
Bottom row: payment mode chip, SHARED badge (if shared), status badge (if shared)
ProgressBar.jsx
Props: value (0–100), colorThresholds (default: green<80, amber<100, red>=100)
Animated fill on mount (CSS transition width)
Show percentage label inside bar if > 20%, else outside
FriendSearchInput.jsx
Self-contained component used in AddExpensePage for split friend selection
Props: onSelect(friend), excludeIds (already selected), placeholder
Debounced search via getFriends() (filter client-side from loaded friends list)
Dropdown list with avatar + username + name
Keyboard navigable (arrow keys + enter)
Modal.jsx
Props: isOpen, onClose, title, children, footer
Overlay: bg-black/60 backdrop-blur-sm
Panel: bg-[--bg-card] rounded-xl border border-[--border] shadow-2xl
Close X button top-right
Trap focus inside, close on Escape key, close on overlay click
Avatar.jsx
Initials-based avatar (no actual image upload required)
Generate consistent color from username string hash
Sizes: sm (w-7 h-7), md (w-9 h-9), lg (w-12 h-12)
Font: font-mono bold
==============================================================
ROUTING (App.jsx)
==============================================================
Use React Router v6 with createBrowserRouter or BrowserRouter
Public routes (no auth required):
/login      → LoginPage
/register   → RegisterPage
/           → redirect to /dashboard
Protected routes (wrapped in auth guard that checks isAuthenticated):
/dashboard          → DashboardPage
/expenses           → ExpensesPage
/expenses/add       → AddExpensePage
/expenses/:id       → ExpenseDetailPage
/expenses/:id/edit  → AddExpensePage (edit mode, prefill form)
/shared-expenses    → redirect to /settlements (or own SharedExpensesPage if desired)
/settlements        → SettlementsPage
/friends            → FriendsPage
/budget             → BudgetPage
/groups             → GroupChatPage
/groups/:groupId    → GroupChatPage (with auto-selected group)
/export             → ExportPage
Auth guard behavior:
If !isAuthenticated && isLoading: show full-page spinner
If !isAuthenticated && !isLoading: redirect to /login
If isAuthenticated: render children within <AppLayout>
==============================================================
STATE MANAGEMENT PATTERNS
==============================================================
Use React Context only for:
Auth state (AuthContext)
Socket instance (SocketContext)
Notifications (NotificationContext)
For page-level data: use local useState + useEffect with API calls
For complex pages (Dashboard): use a custom hook e.g. useDashboard()
Pattern for data fetching:
```jsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  const fetch = async () => {
    try {
      setLoading(true)
      const res = await getSummary()
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load")
      toast.error("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }
  fetch()
}, [])
```
==============================================================
SOCKET.IO INTEGRATION
==============================================================
Initialize in SocketContext on auth:
```js
const socket = io("http://localhost:5000", {
  auth: { token: localStorage.getItem("token") },
  transports: ["websocket"],
  reconnection: true,
})
```
Event listeners to set up in SocketContext:
`settlement:updated`
Payload: { splitId, paidAmount, status, fromUser }
Action: call a registered callback (set via onSettlementUpdate hook)
SettlementsPage registers: () => refetchSettlements()
DashboardPage registers: () => refetchSummary()
`notification:new`
Payload: { notification }
Action: NotificationContext.addNotification(notification)
show react-hot-toast with notification.title
`group:message`
Payload: { message, user, groupId }
Action: if GroupChatPage is open and groupId matches, append message
Else: increment unread badge for that group
`expense:shared_created`
Payload: { sharedExpense, splits }
Action: show toast "You were added to a shared expense"
trigger notification
Group chat — emit on send:
```js
socket.emit("group:message", { groupId, message, expenseId })
```
==============================================================
UTILITY FUNCTIONS
==============================================================
formatCurrency.js
```js
export const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```
formatDate.js
```js
import { format, formatDistanceToNow, parseISO } from "date-fns"
export const formatDate  = (d) => format(parseISO(d), "MMM d, yyyy")
export const formatRelative = (d) => formatDistanceToNow(parseISO(d), { addSuffix: true })
export const formatMonth = (m, y) => format(new Date(y, m - 1), "MMMM yyyy")
```
constants.js
```js
export const CATEGORIES = [
  { name: "Food",              color: "#4A9B7F", icon: "🍜" },
  { name: "Transport",         color: "#4A8FD4", icon: "🚗" },
  { name: "Shopping",          color: "#E8A838", icon: "🛍" },
  { name: "Education",         color: "#9B6ED4", icon: "📚" },
  { name: "Entertainment",     color: "#D95C5C", icon: "🎬" },
  { name: "Health & Medical",  color: "#5BAD7F", icon: "🏥" },
  { name: "Utilities",         color: "#D4A84A", icon: "💡" },
  { name: "Others",            color: "#6B8EC4", icon: "📦" },
]

export const PAYMENT_MODES = ["CASH","UPI","CREDIT_CARD","DEBIT_CARD","NET_BANKING"]

export const PAYMENT_MODE_LABELS = {
  CASH:        "Cash",
  UPI:         "UPI",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD:  "Debit Card",
  NET_BANKING: "Net Banking",
}
```
==============================================================
IMPORTANT IMPLEMENTATION NOTES
==============================================================
NEVER store sensitive data beyond token in localStorage.
token key: "token", user key: "user"
JWT token expiry: if API returns 401 at any point,
the axios interceptor handles logout + redirect automatically.
ALL amounts stored as Float in DB — always display with 2 decimal places.
Date handling: all dates from API are ISO strings.
Always parse with parseISO() before formatting.
Split validation on AddExpensePage:
Sum of all split owedAmounts MUST equal expense.amount exactly
Show real-time validation, disable submit if invalid
"You" row cannot be removed from split list
Budget spentAmount is managed by the BACKEND only.
Frontend only reads it. Never mutate it locally.
For the group chat auto-scroll: use a ref on the last message
and call scrollIntoView({ behavior: "smooth" }) on new messages.
The currency symbol in the UI should come from user.currency:
INR → ₹, USD → $, EUR → €, GBP → £, JPY → ¥
All form submits should disable the submit button and show a
spinner after the first click to prevent duplicate submissions.
Empty states and loading skeletons are REQUIRED for every list/table.
Skeleton: use animated pulse divs matching the shape of real content.