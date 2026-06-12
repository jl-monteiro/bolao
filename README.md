# Bolao

Plataforma privada de competicoes de palpites esportivos com contribuicao via Pix e premiacao automatica.

## Stack

- `apps/web`: Next.js, React, TypeScript, Tailwind CSS
- `apps/api`: NestJS, Prisma, PostgreSQL, OpenAPI
- Monorepo: pnpm workspaces e Turborepo

## Desenvolvimento

```bash
pnpm install
docker compose up -d postgres
Copy-Item .env.example .env
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Web: `http://localhost:3000`

API: `http://localhost:3001`

OpenAPI: `http://localhost:3001/docs`
