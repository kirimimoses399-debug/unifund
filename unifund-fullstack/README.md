# UniFund - University Student Payment Platform

A secure, user-friendly digital payment platform for university students. UniFund enables peer-to-peer money transfers, wallet management, payment requests, and real-time transaction history — all built with the MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas)

### Option 1: Automated Setup
```bash
./setup.sh
```
This script installs dependencies, seeds the database, and starts both backend and frontend.

### Option 2: Manual Setup

**1. Install dependencies:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**2. Configure environment:**
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

**3. Seed demo data:**
```bash
cd backend
node seed.js
```

**4. Start servers:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🏗 Architecture

```
unifund/
├── backend/          # Node.js + Express API
│   ├── config/       # Database & JWT config
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Auth & error middleware
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API routes
│   ├── seed.js       # Demo data seeder
│   └── server.js     # Entry point
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/  # Reusable UI
│   │   ├── context/     # Auth & Wallet context
│   │   ├── pages/       # Route pages
│   │   └── App.js       # Router config
│   └── public/
├── setup.sh          # One-command setup
└── start.sh          # Start both servers
```

## 📦 Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | JWT-based login/register with bcrypt hashing |
| 👛 Wallet | Deposit, withdraw, view real-time balance |
| 💸 Send Money | P2P transfers to other students by email/username |
| 📋 Request | Request money from peers with approve/reject |
| 📜 History | Filterable transaction list with status |
| 👤 Profile | Update personal info & change password |

## 🛡 Security

- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens for stateless authentication
- HTTP-only cookie-ready token storage
- Input validation on all endpoints
- MongoDB injection protection via Mongoose

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | Public |
| POST | `/api/auth/login` | Login & get token | Public |
| GET | `/api/auth/profile` | Get user profile | Required |
| PUT | `/api/auth/profile` | Update profile | Required |
| GET | `/api/wallet/balance` | Get wallet balance | Required |
| POST | `/api/wallet/deposit` | Deposit funds | Required |
| POST | `/api/wallet/withdraw` | Withdraw funds | Required |
| POST | `/api/wallet/transfer` | Send money to user | Required |
| GET | `/api/wallet/transactions` | List transactions | Required |
| POST | `/api/wallet/request` | Request money | Required |
| GET | `/api/wallet/requests` | List requests | Required |
| PUT | `/api/wallet/requests/:id/approve` | Approve request | Required |
| PUT | `/api/wallet/requests/:id/reject` | Reject request | Required |

## 🧪 Demo Accounts

After running `seed.js`, use these accounts:

| Email | Password | Initial Balance |
|-------|----------|-----------------|
| alice@unifund.com | password123 | KSH 10,000 |
| bob@unifund.com | password123 | KSH 5,000 |
| charlie@unifund.com | password123 | KSH 2,500 |
| diana@unifund.com | password123 | KSH 7,500 |

## 🎨 Tech Stack

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- dotenv (environment)
- cors (cross-origin)

**Frontend:**
- React 18 + React Router DOM
- Context API for state management
- Lucide React (icons)
- Custom CSS (no UI framework)
- Responsive design

## 📂 Project Structure Details

### Backend Models

**User:**
- `fullName`, `email`, `password`, `phone`, `studentId`, `university`, `createdAt`
- Virtual `wallet` reference

**Wallet:**
- `user` (ref), `balance` (default: 0), `currency`, `isActive`, `createdAt`

**Transaction:**
- `type` (deposit/withdraw/transfer), `amount`, `sender`/`recipient` (ref), `status`, `description`

**PaymentRequest:**
- `sender`/`recipient` (ref), `amount`, `status` (pending/approved/rejected), `description`

### Frontend Context

**AuthContext:**
- Manages login/register/logout, stores user & token in localStorage, provides `axios` instance with auth header

**WalletContext:**
- Manages balance, transactions, requests, provides CRUD operations for all wallet features

## 📝 Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/unifund
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
```

## 🐛 Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running: `sudo systemctl status mongod`
- Check your `MONGODB_URI` in `.env`

**Port already in use:**
- Backend: Change `PORT` in `.env`
- Frontend: Set `PORT=3001` before `npm start`

**CORS errors:**
- Backend `cors` is configured for `http://localhost:3000`
- Ensure frontend is running on that port

## 📄 License

MIT
