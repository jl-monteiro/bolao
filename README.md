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

## Convites de Grupo

- `OWNER` e `ORGANIZER` podem emitir e revogar Convites.
- Convites expiram em 7 dias; o job de expiracao roda a cada minuto.
- Em produção, o token bruto existe somente na URL enviada por e-mail, dentro
  do fragmento `#token=...`; o banco armazena apenas o hash SHA-256. Ambientes
  locais também o devolvem na emissão para permitir testes automatizados.
- O aceite exige uma conta autenticada, com e-mail verificado e igual ao
  destinatario do Convite.
- O aceite cria um `GroupPendingMembership` por 30 dias. Esse estado nao
  concede acesso ao Grupo ate a validacao de identidade.
- A propria conta convidada valida nome completo, data de nascimento e CPF em
  `/ativar-membro/:pendingId`; depois disso a pendencia vira
  `GroupMembership(MEMBER)` de forma atomica.
- Em desenvolvimento, sem credenciais do Resend, a mensagem e exibida no
  console da API.
- O frontend troca o fragmento por um cookie `HttpOnly`, restrito às rotas de
  proxy de Convites, para preservar o fluxo entre login, verificação e abas.

Superficies principais:

```text
POST   /v1/groups/:groupId/invites
GET    /v1/groups/:groupId/invites
DELETE /v1/groups/:groupId/invites/:inviteId
GET    /v1/groups/:groupId/pending-members
PATCH  /v1/groups/:groupId/members/:membershipId/role
POST   /v1/group-invites/preview
POST   /v1/group-invites/accept
GET    /v1/me/pending-memberships
POST   /v1/me/identity
POST   /v1/me/pending-memberships/:pendingId/activate
```
