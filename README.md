# 💰 Smart Personal Finance Management System

A modern full-stack Personal Finance Management System built using **Angular**, **Node.js**, **Express.js**, and **MongoDB**. The application helps users securely manage their income, expenses, budgets, and financial reports while providing an intelligent **Universal Bank Statement Import Engine** capable of importing statements from multiple banks with automatic categorization and duplicate detection.

---

# 🚀 Features

## 🔐 Authentication

- JWT Authentication
- User Registration & Login
- Secure Password Hashing (bcrypt)
- Protected Routes
- Token-based Authorization

---

## 💵 Income Management

- Add Income
- Edit Income
- Delete Income
- Search Income
- Filter by Month & Year
- Category Management

---

## 💸 Expense Management

- Add Expense
- Edit Expense
- Delete Expense
- Search Expenses
- Filter by Month & Year
- Expense Categories

---

## 📊 Dashboard

- Total Income
- Total Expenses
- Current Balance
- Monthly Financial Summary
- Category-wise Charts
- Recent Transactions
- Dynamic Dashboard Updates

---

## 🎯 Budget Management

- Monthly Budget Creation
- Budget Progress Tracking
- Budget vs Actual Expenses
- Remaining Budget Calculation

---

## 📈 Reports

- Monthly Reports
- Yearly Reports
- Income vs Expense Charts
- Category Analysis
- Financial Statistics

---

# 🆕 Universal Financial Statement Import Engine

The application includes a complete intelligent import workflow that allows users to import bank statements from different banks into the finance dashboard.

## Workflow

```
Upload Statement
        │
        ▼
Preview
        │
        ▼
Duplicate Detection
        │
        ▼
Automatic Categorization
        │
        ▼
Review
        │
        ▼
Permanent Database Import
```

---

## Import Features

### 📂 Universal CSV Import

Supports statements from multiple banks using automatic column detection.

Example supported formats:

- HDFC Bank
- ICICI Bank
- SBI
- Axis Bank
- Kotak
- Bank of Baroda
- Generic CSV formats

---

### 🧠 Intelligent Header Detection

Automatically recognizes different column names.

Examples:

| Bank Header | Standard Header |
|-------------|-----------------|
| Txn Date | Date |
| Value Date | Date |
| Narration | Description |
| Particulars | Description |
| Withdrawal | Debit |
| Deposit | Credit |

---

### 🔍 Duplicate Detection

Automatically detects previously imported transactions using transaction fingerprinting.

Checks include:

- Date
- Amount
- Description
- Merchant Information

Duplicate transactions are skipped safely during import.

---

### 🤖 Automatic Transaction Categorization

Transactions are categorized using multiple strategies:

- Merchant Learning
- Keyword Matching
- Historical Transactions
- Category Confidence Scoring

Example:

```
Swiggy
↓

Food
```

```
Uber
↓

Transport
```

```
Netflix
↓

Entertainment
```

---

### 👤 Manual Review

Transactions requiring attention are highlighted before import.

Users can:

- Change Categories
- Approve Transactions
- Reject Transactions
- Review Duplicate Suggestions

---

### 💾 Permanent Import

Approved transactions are imported into:

- Income Collection
- Expense Collection

The dashboard automatically reflects imported transactions for the selected month.

---

### 📚 Merchant Learning

The system remembers previously categorized merchants to improve future imports.

Example:

```
Amazon

↓

Shopping
```

Future imports of Amazon transactions are categorized automatically.

---

# 🛠 Technology Stack

## Frontend

- Angular
- TypeScript
- Angular Signals
- RxJS
- HTML5
- CSS3

---

## Backend

- Node.js
- Express.js
- JWT Authentication
- Multer
- bcrypt
- Mongoose

---

## Database

- MongoDB
- MongoDB Transactions
- Aggregation Pipelines

---

# 📁 Project Structure

```
client/
│
├── components/
├── pages/
│   ├── dashboard/
│   ├── income/
│   ├── expenses/
│   ├── budgets/
│   ├── reports/
│   ├── import-upload/
│   ├── import-preview/
│   ├── import-duplicates/
│   ├── import-review/
│   ├── import-confirm/
│   └── import-history/
│
├── services/
└── models/

server/
│
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
│   └── parser/
│       ├── HeaderDetector
│       ├── DelimiterDetector
│       ├── TransactionNormalizer
│       ├── HeaderMatcher
│       ├── AmountNormalizer
│       └── DateParser
│
└── scripts/
```

---

# 🔄 Import Pipeline

```
CSV Upload
      │
      ▼
Delimiter Detection
      │
      ▼
Header Detection
      │
      ▼
Header Mapping
      │
      ▼
Transaction Parsing
      │
      ▼
Normalization
      │
      ▼
Duplicate Detection
      │
      ▼
Automatic Categorization
      │
      ▼
Manual Review
      │
      ▼
Permanent Import
```

---

# 📊 Database Collections

- Users
- Income
- Expenses
- Categories
- Budgets
- Merchant Learning
- Import Sessions

---

# 🔒 Security Features

- JWT Authentication
- Password Hashing (bcrypt)
- Protected APIs
- Input Validation
- Duplicate Import Protection
- MongoDB Transactions for Atomic Imports

---

# 📦 Installation

## Clone Repository

```bash
git clone <repository-url>
cd project
```

---

## Backend

```bash
cd server
npm install
npm start
```

Runs on:

```
http://localhost:5000
```

---

## Frontend

```bash
cd client
npm install
ng serve
```

Runs on:

```
http://localhost:4200
```

---

# ⚙ Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection

JWT_SECRET=your_secret_key
```

---

# 📸 Application Modules

- Dashboard
- Income Management
- Expense Management
- Budget Planning
- Reports & Analytics
- Universal Statement Import
- Merchant Learning
- Duplicate Detection

---

# 📈 Future Enhancements

- Excel (.xlsx) Import
- PDF Statement Import
- Manual Column Mapping
- OCR Support
- AI-powered Categorization
- Scheduled Imports
- Multi-Bank Account Support
- Advanced Financial Analytics

---

# 👨‍💻 Author

**Meet Patel**

B.Tech Computer Science & Engineering

Parul University

---

# 📄 License

This project is intended for educational and learning purposes.
