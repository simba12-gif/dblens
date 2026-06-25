# 🔍 DBLens

**See your database think.**

DBLens converts database schemas into interactive, animated ER diagrams. Upload a SQL file, JSON schema, or ORM model and immediately get a draggable, zoomable canvas showing every table, column, relationship, and foreign key in a visual map.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Framer Motion, React Flow
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (MVP2)

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
# Clone the repo
git clone https://github.com/simba12-gif/dblens.git
cd dblens

# Install all dependencies (client + server)
npm install

# Start both dev servers
npm run dev
```

This starts:
- **Client:** http://localhost:3000 (Next.js)
- **Server:** http://localhost:3001 (Express API)

### Individual Commands

```bash
# Client only
npm run dev:client

# Server only
npm run dev:server

# Build everything
npm run build
```

## Project Structure

```
dblens/
├── client/          # Next.js 14 frontend
│   ├── app/
│   │   ├── components/  # React components
│   │   ├── lib/         # API helpers
│   │   ├── upload/      # Schema upload page
│   │   └── visualize/   # ER diagram canvas
│   └── ...
├── server/          # Express backend
│   └── src/
│       ├── parsers/     # SQL & JSON parsers
│       ├── routes/      # API routes
│       └── types/       # TypeScript types
└── package.json     # Root monorepo config
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/schema/parse` | Parse SQL/JSON schema → ER graph |

## License

MIT
