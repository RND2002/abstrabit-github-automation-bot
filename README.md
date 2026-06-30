# Abstrabit GitHub Automation Bot

This repository contains the source code for the Abstrabit project, a GitHub automation bot.

## Project Structure

- `/server`: The backend server handling authentication, webhook processing, and automation workflows.
- `/client`: The React frontend for managing automation rules and repository settings.

## Running Locally

To run the project locally, you will need to start both the server and the client. Ensure you have Node.js and `pnpm` installed.

### 1. Database & Server Setup

The backend uses Prisma. Before starting, make sure you have your `.env.local` configured in the `/server` directory with your database URL and GitHub OAuth credentials.

```bash
cd server
pnpm install

# Generate Prisma client
pnpm run db:generate

# Push schema to the database (if needed)
pnpm run db:push

# Start the server locally
pnpm run local
```

The server will typically start on `http://localhost:3000` (or as defined in your `.env.local`).

### 2. Client Setup

The frontend is a Vite + React application.

```bash
cd client
pnpm install

# Start the development server
pnpm run dev
```

The client will typically start on `http://localhost:5173`. Open this URL in your browser to access the dashboard.
