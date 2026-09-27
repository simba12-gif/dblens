<div align="center">

# 🔍 DBLens

### See your database think.

**DBLens converts database schemas into interactive animated ER diagrams.**  
Upload a SQL file, paste DDL, or connect a live PostgreSQL database — and instantly explore every table, column, relationship, and foreign key in a visual map.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4-green?style=flat-square&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=flat-square&logo=three.js)](https://threejs.org)

[**Live Demo**](https://dblens-client-58deca0yl-simbaaa1205-9900s-projects.vercel.app/) · [**Report Bug**](https://github.com/simba12-gif/dblens/issues) · [**Request Feature**](https://github.com/simba12-gif/dblens/issues)

</div>

---

## ✨ Features

- **📁 Schema Upload** — drag-and-drop `.sql`, `.ddl`, or `.json` files
- **📋 Paste DDL** — paste `CREATE TABLE` statements directly
- **🔌 Live DB Connection** — connect a PostgreSQL database via connection string
- **🗺️ Interactive ER Diagram** — draggable, zoomable canvas with animated neon connectors
- **🌌 Galaxy Mode** — 3D visualization where tables become planets and relationships become orbital paths
- **🤖 AI Assistant** — Gemini-powered chat that understands your schema
- **📊 Database Insights** — centrality analysis, orphan detection, optimization hints
- **🔗 Share Links** — share a diagram URL with anyone, no account needed
- **📸 Export** — download diagrams as PNG or SVG

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Animations | Framer Motion, React Flow |
| 3D | Three.js |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Parsing | node-sql-parser + custom regex fallback |
| AI | Google Gemini 2.0 Flash |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (for share links and live DB connection features)
- A [Google Gemini API key](https://aistudio.google.com) (free tier available)

### 1. Clone the repo

```bash
git clone https://github.com/simba12-gif/dblens.git
cd dblens
```

### 2. Install dependencies

```bash
# Install all dependencies (root + client + server)
npm install
```

### 3. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your values

# Client (optional — defaults work for local dev)
cp client/.env.example client/.env.local
```

### 4. Set up the database

```bash
# Create the PostgreSQL database
createdb dblens

# Run migrations (creates shared_schemas table)
cd server && npm run migrate
```

### 5. Start development servers

```bash
# From the root — starts both Next.js and Express concurrently
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Health check:** http://localhost:3001/api/health

---

## 📁 Project Structure

```
dblens/
├── client/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── upload/            # Schema upload page
│   │   ├── visualize/         # ER diagram canvas
│   │   ├── s/[id]/            # Shared diagram viewer
│   │   ├── components/
│   │   │   ├── landing/       # Landing page components
│   │   │   └── visualize/     # Canvas, nodes, edges, panels
│   │   └── lib/
│   │       ├── api.ts         # API client functions
│   │       ├── types.ts       # Shared TypeScript types
│   │       └── export.ts      # PNG/SVG export utility
│   └── package.json
│
├── server/                    # Express backend
│   └── src/
│       ├── index.ts           # Express app entry point
│       ├── routes/
│       │   ├── schema.ts      # POST /api/schema/parse, /insights
│       │   ├── db.ts          # POST /api/db/connect
│       │   ├── share.ts       # POST/GET /api/share
│       │   └── ai.ts          # POST /api/ai/chat
│       ├── parsers/
│       │   ├── sqlParser.ts   # SQL DDL parser (AST + regex fallback)
│       │   └── jsonParser.ts  # JSON schema parser (+ Prisma shape)
│       ├── analyzers/
│       │   └── insights.ts    # Schema insights generator
│       ├── db/
│       │   ├── pool.ts        # Shared pg Pool
│       │   ├── introspector.ts # Live DB introspection queries
│       │   └── migrate.ts     # Database migrations
│       ├── ai/
│       │   └── assistant.ts   # Gemini AI integration
│       └── types/
│           └── schema.ts      # Canonical TypeScript types
│
└── package.json               # Root monorepo scripts
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/schema/parse` | Parse SQL/JSON schema file or content |
| `POST` | `/api/schema/insights` | Generate insights for a SchemaGraph |
| `POST` | `/api/db/connect` | Introspect a live PostgreSQL database |
| `POST` | `/api/share` | Save a schema and get a share ID |
| `GET` | `/api/share/:id` | Retrieve a shared schema by ID |
| `POST` | `/api/ai/chat` | Send a message to the AI assistant |

---

## 🧪 Test Schemas

Copy these into the **Paste SQL / JSON** tab to test different features:

<details>
<summary>E-Commerce (5 tables)</summary>

```sql
CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE categories (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, slug VARCHAR(100) UNIQUE);
CREATE TABLE products (id SERIAL PRIMARY KEY, category_id INT NOT NULL, name VARCHAR(255) NOT NULL, price DECIMAL(10,2) NOT NULL, stock INT DEFAULT 0);
CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT NOT NULL, total DECIMAL(10,2) NOT NULL, status VARCHAR(50) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE order_items (id SERIAL PRIMARY KEY, order_id INT NOT NULL, product_id INT NOT NULL, quantity INT NOT NULL, unit_price DECIMAL(10,2) NOT NULL);
ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE order_items ADD CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id);
ALTER TABLE order_items ADD CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id);
```

</details>

<details>
<summary>Blog Platform (6 tables — tests self-referential FKs)</summary>

```sql
CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, email VARCHAR(255) NOT NULL UNIQUE, bio TEXT, avatar_url VARCHAR(500), created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE posts (id SERIAL PRIMARY KEY, author_id INT NOT NULL, title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE, body TEXT NOT NULL, published BOOLEAN DEFAULT FALSE, published_at TIMESTAMP);
CREATE TABLE tags (id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, color VARCHAR(7));
CREATE TABLE post_tags (post_id INT NOT NULL, tag_id INT NOT NULL, PRIMARY KEY (post_id, tag_id));
CREATE TABLE comments (id SERIAL PRIMARY KEY, post_id INT NOT NULL, author_id INT NOT NULL, parent_id INT, body TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE likes (id SERIAL PRIMARY KEY, user_id INT NOT NULL, post_id INT, comment_id INT, created_at TIMESTAMP DEFAULT NOW());
ALTER TABLE posts ADD CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE post_tags ADD CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id);
ALTER TABLE post_tags ADD CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id);
ALTER TABLE comments ADD CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id);
ALTER TABLE likes ADD CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE likes ADD CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts(id);
ALTER TABLE likes ADD CONSTRAINT fk_likes_comment FOREIGN KEY (comment_id) REFERENCES comments(id);
```

</details>

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ by <a href="https://github.com/simba12-gif">simba12-gif</a>
</div>
