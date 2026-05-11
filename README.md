# Arcado

<p align="center">
  <img src="client/public/readme-banner.png" alt="Arcado - Play Together, Anywhere" width="760" />
</p>

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

Arcado is a polished real-time multiplayer arcade built for quick rooms, fast rounds, and friends who want to jump straight into the game. Create a private room, share the code, pick the energy, and play together with live state, scores, and results.

## Game Library

| Game | Players | What it feels like |
| --- | ---: | --- |
| Skribble | 2-8 | A live drawing and guessing game where one player sketches and everyone else races to read the chaos. |
| Trivia | 1-10 | Category-based questions with speed scoring, reveal phases, and detailed results. |
| Wordel | 1-4 | A competitive five-letter word race with color-coded guesses and round-by-round progress. |
| Flagel | 1-4 | A flag and geography challenge with country guesses, distance hints, and accuracy scoring. |

## Highlights

- Private room codes for fast invite-based play.
- Real-time gameplay powered by Socket.IO.
- Solo-friendly and multiplayer-ready game modes.
- Authenticated profiles, recent games, stats, and persistent results.
- Admin surfaces for users, rooms, games, moderation, analytics, logs, and settings.
- Prisma and PostgreSQL persistence with seed data for local development.
- AWS ECS Fargate deployment templates and a dedicated deployment runbook.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Web client | Next.js App Router, React, Tailwind CSS, Motion |
| Realtime server | Node.js, Socket.IO, game runtime classes |
| Shared contracts | TypeScript workspace package, Zod schemas |
| Database | PostgreSQL, Prisma, seed scripts |
| Auth | NextAuth with Prisma adapter |
| Deployment | Docker, AWS ECS Fargate, ALB, RDS, CloudFormation |

## Monorepo Map

```text
arcado/
  client/   Next.js app, UI, auth, API routes, admin screens
  server/   Socket.IO server and multiplayer game runtimes
  shared/   Shared types, schemas, constants, and validation
  db/       Prisma schema, database client, and seed data
  deploy/   AWS deployment scripts and CloudFormation templates
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- pnpm 10.30.1
- Docker, for the local PostgreSQL database

### Install

```bash
pnpm install
```

### Configure Environment

Copy the example files and fill in the values for your local machine:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
cp db/.env.example db/.env
```

The default local database URL is:

```text
postgresql://postgres:postgres@localhost:5432/arcado
```

### Start the Database

```bash
pnpm db:up
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### Run the App

```bash
pnpm dev
```

The workspace starts the shared package build and then runs the client and server through Turbo.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development workspace. |
| `pnpm build` | Build all packages. |
| `pnpm lint` | Run lint checks. |
| `pnpm test` | Run package tests. |
| `pnpm db:up` | Start local PostgreSQL. |
| `pnpm db:down` | Stop local PostgreSQL. |
| `pnpm db:studio` | Open Prisma Studio. |

## Deployment

Arcado runs on a single EC2 box with Docker Compose + Caddy, backed by RDS
PostgreSQL. Every push to `main` deploys automatically via GitHub Actions.

Start here:

```text
deploy/ec2/README.md
```

## Brand

Arcado is designed around the feeling of starting a room in seconds and making the first round memorable. The name keeps the arcade spirit while fitting the product more cleanly than the older repository name.
