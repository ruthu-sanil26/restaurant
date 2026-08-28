# AI Agent Based Restaurant Management System

A full-stack MERN app where **custom order food through chatbot** at the table to view the menu, chat with an AI assistant, place orders, get **realtime order status** (Socket.io), and pay by **cash or online**.

## Project Goal

- **Customers**  → open the **customer view**.
- They see the **menu**, chat with the **AI assistant**, **place orders**, get **live order status updates**, and then **pay by cash or online**.

## Features

### Customer flow (QR → table page)

- **Menu** – Browse by category, add items to cart.
- **AI assistant** – Rule-based chatbot (menu, recommendations, hours); optional OpenAI integration.
- **Place order** – Submit order for the table; no login required.
- **Realtime status** – Socket.io updates when staff change order status (pending → confirmed → preparing → ready → served).
- **Payment** – Choose “Pay with cash” or “Pay online” when order is ready/served.

### Staff / admin (dashboard, login required)

- **Auth** – Login, register; roles: admin, staff, waiter.
- **Dashboard** – Overview, recent orders.
- **Menu** – CRUD categories and items (admin).
- **Orders** – Create orders, update status.
- **Tables** – Add tables; each table has a **Customer view (QR)** link to generate QR codes.
- **Settings** – Manage categories (admin).

## Tech Stack

| Layer      | Tech |
|-----------|------|
| Frontend   | React.js, React Router, Context API, Axios, **Socket.io-client**, CSS |
| Backend    | Node.js, Express |
| Database   | MongoDB (Mongoose) |
| Realtime   | **Socket.io** |
| AI Chatbot | Rule-based logic (optional OpenAI integration) |
| Styling    | CSS (no UI framework) |

## Project Structure

```
restaurant/
├── backend/
│   ├── config/       # db, socket (Socket.io)
│   ├── controllers/  # auth, categories, menu, tables, orders, ai, public
│   ├── middleware/   # auth
│   ├── models/       # User, Category, MenuItem, Table, Order
│   ├── routes/       # + publicRoutes (customer API)
│   ├── scripts/      # seed.js
│   └── server.js     # Express + Socket.io
├── frontend/
│   └── src/
│       ├── components/  # Layout, AIAgent
│       ├── context/     # AuthContext
│       ├── pages/       # Login, Dashboard, Menu, Orders, Tables, Settings, TableOrder
│       └── services/    # api
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET
npm run dev
```

Optional seed (admin + sample menu/tables):

```bash
node scripts/seed.js
# Login: admin@restaurant.com / admin123
```

### Frontend

```bash
cd frontend
npm install
npm start
```

- App: `http://localhost:3000`
- Staff login: `/login`
- Customer view (for QR): `/table/:tableId` (get table IDs from **Tables** in the dashboard).

### QR codes

1. Log in to the staff app → **Tables**.
2. For each table, open **Customer view (QR)** or use the URL:  
   `https://your-domain.com/table/<TABLE_ID>`  
3. Generate a QR code for that URL and place it on the table.

## Environment Variables

**Backend (.env):**

- `PORT` – API port (default: 5000)
- `MONGODB_URI` – MongoDB connection string
- `JWT_SECRET` – Secret for JWT

**Frontend (optional):**

- `REACT_APP_SOCKET_URL` – Override Socket.io server URL (default: same origin; proxy used in dev)

## API (summary)

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Staff (protected):** categories, menu, tables, orders CRUD; `PUT /api/orders/:id/status`
- **Public (no auth):**  
  `GET /api/public/menu`, `GET /api/public/tables/:id`,  
  `POST /api/public/orders`, `GET /api/public/orders/:id`,  
  `PATCH /api/public/orders/:id/payment` (body: `{ "paymentMethod": "cash" | "online" }`)
- **AI:** `POST /api/ai/chat` (body: `{ "message": "..." }`)

## Realtime (Socket.io)

- Customer places order → frontend joins room `order:<orderId>`.
- When staff updates order status (or payment), backend emits `orderUpdate` to that room.
- Customer UI updates automatically.

## Payment

- **Cash** – Customer taps “Pay with cash”; order is marked `paymentMethod: cash`, `paymentStatus: paid`. Staff can collect cash as usual.
- **Online** – Customer taps “Pay online”; order is marked `paymentMethod: online`, `paymentStatus: paid`. You can later plug in Stripe or another gateway on the same endpoint or a separate flow.
