# ARCHITECTURE.md

## 1. Project Overview

### Purpose of the Application
The application is a comprehensive personal finance dashboard designed to help users track their income, expenses, and budgets. It serves as a central hub for financial analytics, enabling users to visualize their financial health over time, set budget constraints, and manage categorizations for their spending.

### Business Problem Solved
Managing personal finances manually using spreadsheets is error-prone, time-consuming, and difficult to maintain. Bank statements come in various chaotic CSV formats that lack standardization. This application solves the problem by providing a Universal Financial Statement Import Engine that ingests arbitrary CSV statements, normalizes them, automatically detects duplicates, intelligently categorizes transactions based on machine learning heuristics and user history, and commits them to a unified database for real-time visualization.

### Major Features
- **Dashboard & Analytics**: Real-time charts and metrics displaying net worth, monthly income vs. expense, and budget utilization.
- **Universal Statement Parser**: Dynamically parses bank CSV files, automatically identifying date, description, and amount columns regardless of the bank's format.
- **Intelligent Categorization**: Uses keyword mapping, historical user behavior, and explicit merchant mapping to auto-categorize incoming transactions.
- **Duplicate Detection**: Generates cryptographic fingerprints for transactions to prevent double-counting across overlapping statement uploads.
- **Interactive Review Flow**: Allows users to review, override, and learn from categorizations before committing them to the database.
- **Budgeting**: Allows setting monthly limits per category and tracks spending against those limits.

### High-level Workflow
1. User logs in (JWT authenticated).
2. User views the dashboard to see current financial standing.
3. User navigates to the Import page and uploads a bank CSV.
4. The system parses, normalizes, detects duplicates, and auto-categorizes the data.
5. User reviews the auto-categorization, making manual adjustments if necessary.
6. User confirms the import, which applies the data to the database and learns new merchant mappings.
7. The dashboard immediately reflects the new transactions.

---

## 2. Overall Architecture

The application follows a standard modern MERN-like stack, utilizing Angular for the frontend instead of React. 

### Frontend
- **Framework**: Angular 21 (running natively in Zoneless mode).
- **Styling**: Vanilla CSS.
- **State Management**: Angular Signals for synchronous reactivity (used heavily in the Dashboard) and localized component state.
- **Routing**: Angular Router with lazy-loaded standalone components.

### Backend
- **Framework**: Node.js with Express.js.
- **Architecture**: Controller-Service pattern. Controllers handle HTTP request/response validation, while Services handle complex business logic (e.g., Categorization, Parsing).
- **Authentication**: JWT (JSON Web Tokens) passed via Authorization headers.

### Database
- **Engine**: MongoDB (accessed via Mongoose ODM).
- **Deployment**: Configured for replica sets to support multi-document ACID transactions (essential for the Import Engine's commit/rollback safety).

### Data Flow

```text
+-------------------+        HTTP JSON         +-------------------+
|                   |   (JWT Authenticated)    |                   |
|  Angular Client   | <======================> |  Express Backend  |
|                   |                          |                   |
+-------------------+                          +-------------------+
         |                                               |
         | Signals / RxJS                                | Mongoose Models
         v                                               v
+-------------------+                          +-------------------+
|                   |                          |                   |
|     DOM / UI      |                          |     MongoDB       |
|                   |                          |                   |
+-------------------+                          +-------------------+
```

---

## 3. Folder Structure

### `client/`
Contains the Angular frontend application.
- **`src/app/pages/`**: Contains all routed standalone components (Dashboard, Import, Income, etc.). Each folder represents a distinct feature module.
- **`src/app/components/`**: Reusable UI components (Sidebar, MonthSelector).
- **`src/app/services/`**: Angular HTTP services communicating with the backend APIs.
- **`src/app/interceptors/`**: HTTP Interceptors (e.g., AuthInterceptor for attaching JWTs).
- **`src/app/guards/`**: Route guards (AuthGuard) to protect authenticated pages.

### `server/`
Contains the Node.js/Express backend application.
- **`controllers/`**: HTTP route handlers. Responsible for extracting request data, calling services, and formatting HTTP responses.
- **`services/`**: Core business logic modules. Separated from controllers to allow for testing and reusability (e.g., `categorizationService.js`).
- **`models/`**: Mongoose schemas defining the structure, relationships, and validations of the MongoDB database.
- **`utils/`**: Helper functions and algorithms. Contains the heavy-lifting logic for the Universal Statement Parser (`CSVParser.js`, `transactionFingerprint.js`).
- **`routes/`**: Express router configurations mapping URLs to specific Controller functions.
- **`scripts/`**: Development and database migration utilities.

---

## 4. Frontend

### Dashboard (`/dashboard`)
- **Purpose**: The primary landing page showing a high-level summary of the user's finances.
- **Components**: `SidebarComponent`, `MonthSelectorComponent`.
- **Services**: `TransactionService`, `BudgetService`.
- **State Management**: Heavily utilizes Angular Signals (`incomeSignal`, `expenseSignal`) updated via `effect()` blocks for immediate reactivity when the selected month changes.
- **User Workflow**: User views charts. Changes the month using the Month Selector, triggering an automatic data refetch and chart redraw.

### Income (`/income`) & Expenses (`/expenses`)
- **Purpose**: Paginated, filterable lists of individual transactions.
- **Route**: `/income`, `/expenses`.
- **Services**: `TransactionService`.
- **API Calls**: `GET /api/income?month=X&year=Y`, `GET /api/expenses?month=X&year=Y`.
- **User Workflow**: User views a detailed ledger of their transactions. Can edit or delete individual entries.

### Budgets (`/budgets`)
- **Purpose**: Manage spending limits per category.
- **Services**: `BudgetService`, `CategoryService`.
- **User Workflow**: User sets a monetary limit for "Groceries", which the system tracks against the sum of all expenses in that category for the current month.

### Reports (`/reports`)
- **Purpose**: Deep-dive analytical views, trend analysis, and year-over-year comparisons.

### Import (`/import`)
- **Purpose**: The entry point for uploading bank CSV statements.
- **Route**: `/import`
- **API Calls**: `POST /api/imports/upload` (multipart/form-data).
- **User Workflow**: User selects a CSV file. The system uploads it, and if successful, navigates the user to the Import Review page.

### Import Review (`/import/review/:sessionId`)
- **Purpose**: The interactive stage where users validate the engine's automatic categorization and duplicate detection.
- **Components Used**: Forms for category overrides.
- **Services**: `CategoryService`.
- **State Management**: Local primitive state tracked explicitly via `ChangeDetectorRef.detectChanges()` (due to Zoneless architecture).
- **User Workflow**: The UI displays transactions split into "Categorized" and "Needs Review". The user assigns categories to unknown transactions. Once all are resolved, they click "Continue".

### Import Confirm (`/import/confirm/:sessionId`)
- **Purpose**: Final confirmation page displaying the summary of what is about to be committed to the database.
- **User Workflow**: User clicks "Confirm Import". The backend executes the database transaction. The user is redirected to the Dashboard or Import History.

### Import History (`/import/history`)
- **Purpose**: Displays an audit log of all previous statement imports.
- **User Workflow**: User can view past imports and trigger a "Rollback" if a mistake was made, safely removing all associated transactions.

### Authentication (`/login`, `/register`)
- **Purpose**: User onboarding and session management.
- **State Management**: Stores JWT in `localStorage`.

---

## 5. Backend Controllers

### `authController.js`
- **Purpose**: Manages user registration, login, and JWT generation.
- **Endpoints**: `POST /api/auth/register`, `POST /api/auth/login`.

### `importController.js`
- **Purpose**: The orchestrator for the Universal Statement Parser. Handles the entire multi-stage import lifecycle.
- **Endpoints**: 
  - `POST /api/imports/upload`: Ingests CSV, creates an `ImportSession`.
  - `GET /api/imports/session/:id`: Retrieves the current state of a session.
  - `POST /api/imports/session/:id/check-duplicates`: Triggers the duplicate detection service.
  - `POST /api/imports/session/:id/categorize`: Triggers the auto-categorization service.
  - `POST /api/imports/session/:id/learn`: Applies user-overridden categories to the `MerchantMapping` collection.
  - `POST /api/imports/confirm`: Executes the final MongoDB bulk write transaction.

### `incomeController.js` & `expenseController.js`
- **Purpose**: CRUD operations for financial records.
- **Endpoints**: `GET`, `POST`, `PUT`, `DELETE`.
- **Validations**: Ensures all records are tied to the authenticated `userId`. Uses exact UTC boundary filtering for month/year queries.

### `budgetController.js` & `categoryController.js`
- **Purpose**: Manages user-defined categories and their monthly limits.

---

## 6. Database

### `Users`
- **Schema**: `email` (unique), `password` (hashed).
- **Indexes**: `email`.

### `Income` & `Expenses`
- **Schema**: `userId`, `amount`, `description`, `category`, `transactionDate`, `importHistoryId` (optional, used for rollbacks).
- **Indexes**: `{ userId: 1, transactionDate: -1 }` to optimize dashboard chronological queries.
- **Relationships**: Tied directly to a `User` and optionally an `ImportHistory`.

### `Budgets`
- **Schema**: `userId`, `category`, `amount`, `month`, `year`.

### `Categories`
- **Schema**: `userId`, `name`, `type` (Income/Expense).

### `MerchantMappings`
- **Schema**: `userId`, `merchantName` (normalized), `category`, `confidence`, `lastUsed`.
- **Purpose**: The machine-learning memory. Maps a string like "WALMART #1234" to "Groceries".

### `ImportSessions`
- **Schema**: `userId`, `transactions` (Array of embedded documents representing the parsed CSV rows), `status` (PENDING, REVIEWED).
- **Purpose**: Temporary storage allowing the user to pause, leave, and return to an import review without losing state.

### `ImportHistory`
- **Schema**: `userId`, `date`, `totalTransactions`, `importedCount`, `duplicateCount`.
- **Purpose**: Audit log allowing for cascading rollbacks.

---

## 7. Universal Statement Parser

The parser is the most complex sub-system. It operates completely independently of any specific bank format through a multi-pass heuristic engine (`server/utils/CSVParser.js`).

### Workflow
1. **Delimiter Detection**: Analyzes the raw file buffer to guess whether the file is comma, semicolon, or tab-delimited.
2. **Header Detection**: Scans the first 20 lines to find the row with the highest density of known financial keywords (Date, Amount, Description, Debit, Credit).
3. **Header Mapping**: Dynamically maps the found columns to internal standard schema (`transactionDate`, `amount`, `description`). Handles single-column amounts (with positive/negative values) vs. dual-column (Debit/Credit).
4. **Normalization**: Cleans descriptions (removing extra whitespace, standardizing casing) and normalizes dates to strict ISO UTC strings to prevent timezone shifting.
5. **Duplicate Detection**: Generates an MD5 fingerprint `hash(userId + date + amount + normalizedDescription)`. Compares this against the database to flag `EXACT` or `POTENTIAL` duplicates.
6. **Categorization**: Passes the normalized data through the `categorizationService.js` (Keyword fallback -> Historical mapping -> Merchant learning).
7. **Review & Confirmation**: Temporary data is saved to `ImportSession`. The user adjusts it.
8. **Commit**: A MongoDB transaction takes the approved records from the `ImportSession`, inserts them into `Income`/`Expense`, creates an `ImportHistory` record, and deletes the `ImportSession`.

---

## 8. Services

### `categorizationService.js`
- **Responsibility**: Assigning the best possible category to a raw transaction string.
- **Logic Flow**:
  1. Checks `MerchantMappings` for an exact normalized match.
  2. If none, falls back to Regex-based Keyword mapping (e.g., `/uber/i` -> "Transport").
  3. Returns a `confidence` score and `categoryStatus` (`AUTO`, `REVIEW`, `UNKNOWN`).

### `duplicateService.js`
- **Responsibility**: Preventing double-entry.
- **Logic**: Queries the database for existing transactions on the same date with the same amount. Evaluates description similarity to flag `POTENTIAL` duplicates, or identical fingerprints to flag `EXACT` duplicates.

### `merchantLearningService.js`
- **Responsibility**: Updating the user's `MerchantMappings` when they manually override a category during the Review stage, ensuring the system gets smarter over time.

### `transactionFingerprint.js`
- **Responsibility**: Cryptographic hashing of transaction identities to provide immutable comparison keys.

---

## 9. API Documentation

*(Excerpt of critical endpoints)*

### `POST /api/imports/upload`
- **Purpose**: Upload and parse CSV.
- **Request**: `multipart/form-data`, field `file`.
- **Response**: `{ sessionId: string, transactionCount: number }`
- **Auth**: Required.

### `POST /api/imports/confirm`
- **Purpose**: Finalize import to DB.
- **Request**: `{ sessionId: string }`
- **Response**: `{ message: string, summary: Object, historyId: string }`
- **Auth**: Required.
- **Errors**: `404` if session expired. `500` if MongoDB transaction fails.

### `GET /api/income`
- **Purpose**: Fetch income records.
- **Request Query**: `month` (1-12), `year` (YYYY).
- **Response**: `[ { _id, amount, description, transactionDate, category } ]`

---

## 10. Complete Import Workflow Sequence

```text
User            Frontend (Angular)           Backend (Express)            Database (Mongo)
 |                      |                            |                           |
 |--- Upload CSV ------>|                            |                           |
 |                      |--- POST /upload ---------->|                           |
 |                      |                            |--- Parse CSV              |
 |                      |                            |--- Create Session ------->|
 |                      |<-- { sessionId } ----------|                           |
 |                      |                            |                           |
 |--- Redirect Review ->|                            |                           |
 |                      |--- POST /check-duplicates >|                           |
 |                      |                            |--- Query existing ------->|
 |                      |<-- { duplicates flagged } -|                           |
 |                      |                            |                           |
 |                      |--- POST /categorize ------>|                           |
 |                      |                            |--- Run Heuristics         |
 |                      |<-- { categorized txs } ----|                           |
 |                      |                            |                           |
 |--- Map Unknowns ---->|                            |                           |
 |--- Click Continue -->|                            |                           |
 |                      |--- POST /learn ----------->|                           |
 |                      |                            |--- Upsert Mappings ------>|
 |                      |--- POST /confirm --------->|                           |
 |                      |                            |--- BEGIN TRANSACTION      |
 |                      |                            |--- Insert Income/Exp ---->|
 |                      |                            |--- Delete Session ------->|
 |                      |                            |--- COMMIT TRANSACTION     |
 |                      |<-- { summary } ------------|                           |
 |--- View Dashboard -->|                            |                           |
```

---

## 11. Error Handling

- **Invalid CSV**: `CSVParser.js` throws specific errors if headers cannot be found or if data rows do not match column counts. Controller catches this and returns a `400 Bad Request` with a human-readable message.
- **Duplicate Imports**: Blocked explicitly at the UI level via the `duplicate` flag. If a user bypasses the UI, the MongoDB `transactionFingerprint` logic handles graceful skipping.
- **Authentication Failures**: The `AuthInterceptor` on the frontend catches `401 Unauthorized` responses and forcibly logs the user out, redirecting to `/login`.
- **Database Failures**: Handled using Mongoose Sessions. If an import commit fails halfway through, the `abortTransaction()` method is called, rolling back all partial inserts safely.

---

## 12. Security

- **JWT (JSON Web Tokens)**: Used statelessly for all API authorization. Stored in `localStorage`.
- **Bcrypt**: All user passwords are salted and hashed before insertion into the `Users` collection.
- **MongoDB Transactions**: Ensures that large batch imports cannot result in corrupted or partial states if the server crashes mid-import.
- **Protected Routes**: Angular `AuthGuard` prevents navigation to dashboard or import tools without a valid local token.
- **Validation**: All Express routes utilize strictly parsed IDs and enforce `userId` scoping (a user can never query or delete another user's transactions).

---

## 13. Performance

- **N+1 Query Optimization**: The final import commit step groups all Income and Expense arrays and utilizes MongoDB `insertMany()` instead of iterating and inserting rows one by one.
- **Bulk Loading**: Merchant learning utilizes MongoDB `bulkWrite()` with `upsert` operations, drastically reducing database lock contention.
- **Map Lookups**: Duplicate detection transforms database arrays into Javascript `Map` and `Set` objects (O(1) lookup) before comparing them against the incoming CSV payload (O(n)), preventing O(n^2) time complexity.
- **Indexes**: `userId` combined with `transactionDate` are indexed as compound keys, making the Dashboard's monthly queries highly performant even with millions of records.
- **Parser Optimization**: The CSV Parser only samples the first 20 lines to determine headers and delimiters, skipping full-file regex passes.

---

## 14. Design Decisions

- **Zoneless Angular Configuration**: The application leverages modern Angular's Zoneless architecture. This forces high-performance rendering that relies on explicitly updating views via Signals or `ChangeDetectorRef`, stripping away the massive overhead of `zone.js` monkey-patching browser events.
- **Session-Based Import**: Parsing a 5,000-line CSV and running duplicate detection takes time. By dumping the intermediate result into an `ImportSession` collection, the server can safely respond to the client. This also prevents data loss if the user refreshes the browser during the review stage.
- **Universal Parser over Explicit Bank Formats**: Hardcoding formats for Chase, BoA, or Wells Fargo requires constant maintenance when banks change their exports. A heuristic parser that dynamically hunts for date/amount columns is infinitely more resilient.

---

## 15. Future Improvements

1. **Refactor Primitive State to Signals**: Currently, the `ImportConfirm` and `ImportReview` components rely on primitive state variables (`isLoading = false`) coupled with manual `ChangeDetectorRef.detectChanges()` calls. These should be refactored to Angular Signals (`isLoading = signal(true)`) to align with the Dashboard's architectural purity.
2. **Remove `zone.js` Polyfill**: The `main.ts` file still arbitrarily imports `zone.js`, wasting ~28kB of bundle budget despite the application being strictly configured for Zoneless mode. This import must be removed.
3. **Web Worker Offloading**: Moving the `CSVParser.js` logic to a Web Worker on the frontend could theoretically save backend CPU cycles, parsing the file client-side before sending normalized JSON to the server.
4. **Enhanced Analytics**: Implement Redis caching for the `/reports` analytical endpoints to prevent expensive MongoDB aggregation pipelines on every load. 
