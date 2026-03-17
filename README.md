# React + Vite + TypeScript Game App (Monorepo)

A minimal React application with Vite, TypeScript, and a Node.js backend for hosting multiplayer game sessions. Organized as a pnpm workspace monorepo.

## Features

- **Full-page Canvas**: Responsive canvas that fills the entire viewport
- **Real-time Multiplayer**: Socket.io-based game session management
- **TypeScript**: Full type safety across frontend, backend, and shared modules
- **Monorepo Structure**: Organized workspace with shared types and utilities
- **Game Sessions**: Create and join game sessions with multiple players

## Tech Stack

### Frontend (`packages/frontend`)
- React 19
- TypeScript
- Vite
- Socket.io Client

### Backend (`packages/backend`)
- Node.js
- Express
- Socket.io
- TypeScript

### Shared (`packages/shared`)
- TypeScript type definitions
- Shared interfaces and types
- Game session models

## Project Structure

```
├── packages/
│   ├── shared/           # Shared types and interfaces
│   │   ├── src/
│   │   │   └── index.ts  # Type definitions
│   │   ├── dist/         # Built types
│   │   └── package.json
│   ├── backend/          # Game server
│   │   ├── src/
│   │   │   └── server.ts # Server implementation
│   │   ├── dist/         # Built server
│   │   └── package.json
│   └── frontend/         # React app
│       ├── src/          # React components
│       ├── public/       # Static assets
│       ├── dist/         # Built app
│       └── package.json
├── pnpm-workspace.yaml   # Workspace configuration
└── package.json          # Root package.json
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm

### Installation

1. Clone the repository and install dependencies:
```bash
pnpm install
```

### Building Shared Types

The shared types are automatically built when building dependent packages (backend/frontend). No manual build step required!

### Running the Application

1. **Start the Backend Server** (in one terminal):
```bash
pnpm server
```
The server will run on `http://localhost:3001`

2. **Start the Frontend Dev Server** (in another terminal):
```bash
pnpm dev
```
The frontend will run on `http://localhost:5173`

### Game Session Management

- **Create Session**: Click "Create Session" to start a new game session
- **Join Session**: Click "Join Session" and enter the session ID
- **Connection Status**: The canvas background shows connection status (green = connected, red = disconnected)
- **Player Count**: Displayed on the canvas showing current players in the session

## API Endpoints

- `GET /api/sessions` - List all active game sessions
- `POST /api/sessions` - Create a new game session

## Socket Events

### Client → Server
- `join-session` - Join a game session
- `leave-session` - Leave current session
- `game-action` - Send game actions to other players

### Server → Client
- `player-joined` - A player joined the session
- `player-left` - A player left the session
- `game-action` - Receive game actions from other players

## Development Scripts

### Root Level Scripts
- `pnpm build` - Build all packages (shared types built automatically)
- `pnpm build:backend` - Build backend + shared types
- `pnpm build:frontend` - Build frontend
- `pnpm dev` - Start frontend dev server
- `pnpm server` - Start backend server
- `pnpm server:dev` - Start backend server with auto-reload
- `pnpm lint` - Lint all packages
- `pnpm clean` - Clean all build artifacts
- `pnpm type-check` - Type check all packages

## Shared Types

The `@ih3t/shared` package contains:

- `GameSession` - Game session data structure
- `Player` - Player information
- `GameAction` - Game action payload
- Socket.io event type definitions
- API request/response types

**Automatic Inclusion**: The shared types are automatically built and included when building dependent packages (backend/frontend) thanks to TypeScript project references. No manual build step required!
