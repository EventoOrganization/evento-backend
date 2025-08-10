# Evento-Backend Express.js Project

## Introduction

Welcome to the Evento Backend project. This project serves as the backend for the Evento application, built with Express.js. It provides API endpoints and handles server-side logic for the application.

## Project Structure

- **backend**: Contains the Express.js application.

## Prerequisites

- Node.js version 14.x or higher
- PNPM

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/EventoOrganization/evento_backend
   cd evento_backend
   ```

2. **Install dependencies**:

   ```sh
   pnpm install
   ```

3. **Create a `.env` file**:

   ```sh
   cp .env.example .env
   ```

## Usage

1. **Start the development server**:

   ```sh
   npm run start
   ```

2. **The server should now be running on http://localhost:8747**:

## Migrations

We use `migrate-mongo` for database migrations. Follow these steps to run and manage migrations.

### Initial Setup

1. **Install migrate-mongo**:

   ```sh
   npm install -g migrate-mongo

   ```

2. **Initialize migrate-mongo**:

   ```sh
   migrate-mongo init

   ```

3. **Configure migrate-mongo**:
   Update `migrate-mongo-config.js` with your MongoDB connection details.

### Running Migrations

1. **Create a new migration**:
   ```sh
   migrate-mongo create <migration-name>
   ```
2. **Apply migrations**:
   ```sh
   migrate-mongo up
   ```
3. **Rollback migrations**:
   ```sh
   migrate-mongo down
   ```

For more details, refer to the [migrate-mongo documentation](https://github.com/seppevs/migrate-mongo)

## 🚀 EventoApp.io – Tech Stack Overview

### 🖥️ Frontend – `evento-web` (Next.js PWA)

**Core Stack**
- **Framework**: Next.js 14 (App Router, PWA support)
- **Language**: TypeScript
- **UI**: Tailwind CSS with `tailwind-merge`, `clsx`, and `cva`
- **Component System**: Radix UI, Lucide icons, custom `@ezstart/ez-tag`
- **Forms**: React Hook Form + Zod + resolvers
- **Maps & Geolocation**: `@react-google-maps/api`
- **Media**: `react-easy-crop`, HEIC conversion, slick-carousel
- **State Management**: Zustand (typed, slice-based architecture)
- **WebSocket**: `socket.io-client`
- **Accessibility & SEO**: semantic, variant-based components + `next-sitemap`

**Main Features**
- Fully responsive and mobile-first UI
- Local image cropping, preview, and upload (to S3)
- Stripe Checkout integration (ticketing, onboarding)
- Confetti effects, toasts, and animated UX
- Multilingual routes (`/fr`, `/en`)
- JWT-based authentication via global context

**Tooling**
- ESLint, Prettier, Husky, Commitizen (conventional commits)
- Testing: Jest
- Scripts managed with `pnpm`
- Build process with `next build` and `next-pwa`

---

### 🛠️ Backend – `evento-backend` (Node.js API)

**Core Stack**
- **Language**: TypeScript
- **Framework**: Express.js with EJS templating
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, `express-session`
- **WebSocket**: Socket.IO for chat and realtime updates
- **File Handling**: Multer, AWS S3, ffmpeg, express-fileupload
- **Email & Notifications**: Mailjet, Nodemailer, Web Push
- **Stripe Integration**: Webhooks for checkout & onboarding
- **Scheduled Tasks**: `node-schedule` (cron jobs)
- **Validation**: `node-input-validator`

**Dev Tooling**
- Hot reload with `nodemon`
- Type safety via `@types` and strict TS config
- Mongo migrations: `migrate-mongo`
- Scripted build & asset copying: `tsc`, `cpx`, `pnpm`

---

> ✅ Modular, full-typed architecture. Secure JWT-based communication between frontend and backend. Complete event management system including ticketing, file uploads, payments, and notifications.


