# PulseBoard frontend

React 19 + TypeScript + Vite + Tailwind 4 + TanStack Query, wired to the PulseBoard API and Socket.IO server.

## Run

```bash
npm install
cp .env.example .env      # then fill in values
npm run dev               # http://localhost:5173 (the origin your backend's CORS allows)
```

Env vars: `VITE_API_URL` (include `/api`), optional `VITE_SOCKET_URL`, and `VITE_RAZORPAY_KEY_ID` (public key id only).

## Screens

Auth (login, register, verify email, forgot/reset password) · Projects · Project board (drag and drop, filters, task details, comments) · Members and roles · Activity · Notifications (live) · Billing (Razorpay) · Settings (notification preferences)
