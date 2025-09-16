# QR Menu (Express + Postgres)

This app lets restaurants create sections and dishes, generate a QR code to their public menu, and share the link.

## Stack
- Express, EJS
- Passport local auth + sessions
- Prisma ORM with Postgres
- QR code generator

## Setup
1. Install Node.js (v18+ recommended) and npm.
2. Create a Postgres database and get the connection URL.
3. Create `.env` from example and edit values:
```bash
cp .env.example .env
```
4. Install deps:
```bash
npm install
```
5. Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```
6. Start dev server:
```bash
npm run dev
```

Visit http://localhost:3000

## Features
- Register restaurant, login
- Manage sections and dishes
- Public menu at `/m/:slug`
- QR image at `/m/:slug/qr`
- Copy share link on public menu

## Folders
- `src/routes` - auth, dashboard, public
- `src/views` - EJS templates
- `public` - static assets (styles, JS)
