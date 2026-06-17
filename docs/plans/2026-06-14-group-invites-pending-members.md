# Group Invites and Pending Members Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Let Owners and Organizers issue and revoke seven-day Group invitations, let the intended authenticated account accept exactly once, and create a thirty-day pending membership without granting private Group access.

**Architecture:** Keep `GroupMembership` as the only private-access boundary. Store only a SHA-256 invitation token hash, represent accepted-but-not-identity-validated users in `GroupPendingMembership`, and perform state changes plus audit writes in the same Prisma transaction. Deliver the raw token through the invitation email URL fragment so it is not sent in HTTP request URLs. The web app immediately exchanges the fragment for a path-scoped `HttpOnly` cookie, and same-origin Next.js route handlers submit it to the API in JSON bodies for preview and acceptance.

**Tech Stack:** NestJS 11, Prisma 7.6, PostgreSQL 17, Better Auth 1.6, Next.js 16.2, React 19.2, Jest 30, Playwright 1.60 with Brave, project-owned CSS design system.

---

## Canonical Decisions

- `CONTEXT.md` wins over the older handoff wording.
- Accepting an invitation creates `GroupPendingMembership`, not `GroupMembership`.
- A pending membership expires after 30 days and never appears in existing Group/member queries.
- Identity validation and activation into `GroupMembership` remain a later increment.
- Invitation tokens are generated with `randomBytes(32)`, emailed in a URL fragment, stored only as SHA-256, and never written to audit records. Production issuance responses omit the raw URL; local/test responses may expose it for automation.
- Invitation expiry is 7 days; accepted pending membership expiry is 30 days.
- `OWNER` and `ORGANIZER` can manage invitations; `MEMBER` receives `403`; outsiders and nonexistent Groups remain indistinguishable `404`.
- User mismatch, unknown token, and revoked token must not expose the target email.
- Sequential and concurrent duplicate acceptance by the same intended account are idempotent and produce one pending membership and one acceptance audit event.

### Task 1: Extend authorization policy for invitation management

**Files:**
- Modify: `apps/api/src/groups/group-role.policy.spec.ts`
- Modify: `apps/api/src/groups/group-role.policy.ts`

**Step 1: Write failing tests**

Add tests requiring:

```ts
expect(() => policy.assertCanManageInvites(GroupRole.OWNER)).not.toThrow();
expect(() => policy.assertCanManageInvites(GroupRole.ORGANIZER)).not.toThrow();
expect(() => policy.assertCanManageInvites(GroupRole.MEMBER)).toThrow(
  new ForbiddenException("Você não pode administrar Convites deste Grupo."),
);
```

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- group-role.policy.spec.ts`

Expected: FAIL because `assertCanManageInvites` does not exist.

**Step 3: Implement minimal policy and verify GREEN**

Add only the new policy method, sharing a private administrative-role predicate if it removes duplication.

Run: `pnpm --filter @bolao/api test -- group-role.policy.spec.ts`

Expected: all policy tests pass.

### Task 2: Model invitations, pending memberships, and system audit actors

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260614150000_add_group_invites_pending_members/migration.sql`

**Step 1: Add schema types**

Add:

```prisma
enum GroupInviteStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}

enum PendingMembershipStatus {
  PENDING
  ACTIVATED
  EXPIRED
}

enum AuditActorType {
  USER
  SYSTEM
}
```

Extend `AuditAction` with:

```text
GROUP_INVITE_ISSUED
GROUP_INVITE_REVOKED
GROUP_INVITE_ACCEPTED
GROUP_INVITE_EXPIRED
GROUP_PENDING_MEMBERSHIP_EXPIRED
GROUP_MEMBERSHIP_ACTIVATED
```

Add `GroupInvite` with target email, unique token hash, lifecycle timestamps, issuer/acceptor/revoker relations, Group relation, and status.

Add `GroupPendingMembership` with Group/User/Invite relations, accepted/expiry timestamps, lifecycle status, and optional future activated membership relation.

Add `actorType` to `AuditLog`, make `actorId` optional, and keep existing user audit relations valid.

**Step 2: Add database invariants**

The migration must add:

- unique `tokenHash`;
- one active `PENDING` invitation per normalized `(groupId, targetEmail)` through a partial unique index;
- one active pending membership per `(groupId, userId)` through a partial unique index;
- check constraint requiring `actorId` for `USER` actors and forbidding it for `SYSTEM`;
- indexes for invitation status/expiry and pending membership status/expiry.

**Step 3: Generate and validate**

Run:

```text
pnpm db:generate
pnpm --filter @bolao/api typecheck
```

Expected: generated Prisma client includes the new models/enums and TypeScript passes.

### Task 3: Implement secure token and invitation email builders test-first

**Files:**
- Create: `apps/api/src/groups/group-invite-token.service.spec.ts`
- Create: `apps/api/src/groups/group-invite-token.service.ts`
- Create: `apps/api/src/notifications/group-invite-email.spec.ts`
- Create: `apps/api/src/notifications/group-invite-email.ts`
- Modify: `apps/api/src/notifications/notification-provider.ts`
- Modify: `apps/api/src/auth/auth.ts`

**Step 1: Write failing token tests**

Require generated raw tokens to be URL-safe, hashes deterministic, and raw token different from stored hash.

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- group-invite-token.service.spec.ts`

Expected: FAIL because the service does not exist.

**Step 3: Implement token service**

Use Node `crypto.randomBytes(32).toString("base64url")` and `createHash("sha256")`.

**Step 4: Write failing email tests**

Require the message to contain:

```text
{WEB_URL}/convites/aceitar#token={rawToken}
```

and never place the token in a query parameter.

**Step 5: Expose one shared notification provider**

Export a singleton provider value from `notification-provider.ts`; reuse it in Better Auth and register it in `GroupsModule` through an injection token.

**Step 6: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- token invite-email notifications`

Expected: focused tests pass.

### Task 4: Implement invitation service and controller test-first

**Files:**
- Create: `apps/api/src/groups/dto/create-group-invite.dto.ts`
- Create: `apps/api/src/groups/dto/accept-group-invite.dto.ts`
- Create: `apps/api/src/groups/dto/group-invite-response.dto.ts`
- Create: `apps/api/src/groups/dto/group-invite-preview-response.dto.ts`
- Create: `apps/api/src/groups/dto/group-pending-member-response.dto.ts`
- Create: `apps/api/src/groups/group-invites.service.spec.ts`
- Create: `apps/api/src/groups/group-invites.service.ts`
- Create: `apps/api/src/groups/group-invites.controller.spec.ts`
- Create: `apps/api/src/groups/group-invites.controller.ts`
- Modify: `apps/api/src/groups/groups.module.ts`

**Step 1: Write failing policy and service tests**

Cover:

- normalized target email;
- seven-day expiry from an injected clock;
- no invite to an existing member or active pending member;
- Owner/Organizer allowed, Member `403`, outsider `404`;
- duplicate active invitation `409`;
- list responses never expose token/hash;
- revoke is idempotent and audited once;
- preview validates authenticated email without exposing target email;
- accept creates exactly one 30-day `GroupPendingMembership`;
- sequential duplicate accept returns the existing pending result;
- wrong user does not consume the invitation;
- expired/revoked/unknown invitations create no pending membership;
- audit payloads contain IDs/status/timestamps only, never token/hash/email.

**Step 2: Verify RED**

Run:

```text
pnpm db:generate
pnpm --filter @bolao/api test -- group-invites
```

Expected: FAIL because service/controller/DTOs do not exist.

**Step 3: Implement endpoints**

```text
POST   /v1/groups/:groupId/invites
GET    /v1/groups/:groupId/invites
DELETE /v1/groups/:groupId/invites/:inviteId
GET    /v1/groups/:groupId/pending-members
POST   /v1/group-invites/preview
POST   /v1/group-invites/accept
```

`POST /groups/:groupId/invites` sends the email after the database transaction commits. If delivery fails, preserve the issued invitation and return a delivery failure that can be retried by revoking/reissuing; do not roll back an already committed invitation after an external side effect.

Acceptance must use a conditional state transition plus unique constraints inside one transaction. A losing concurrent request reloads and returns the same pending membership only when it belongs to the same intended user.

**Step 4: Document OpenAPI**

Add cookie auth, DTO schemas, `201/200/204`, `400`, `401`, `403`, `404`, `409`, and `410` responses.

**Step 5: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- groups`

Expected: all Group-related unit tests pass.

### Task 5: Implement automatic expiry test-first

**Files:**
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/groups/group-invite-expiration.service.spec.ts`
- Create: `apps/api/src/groups/group-invite-expiration.service.ts`
- Modify: `apps/api/src/groups/groups.module.ts`

**Step 1: Write failing tests**

Require one run to:

- change due invitations from `PENDING` to `EXPIRED`;
- change due pending memberships from `PENDING` to `EXPIRED`;
- write one `SYSTEM` audit event for each transition;
- remain idempotent when run again.

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- group-invite-expiration.service.spec.ts`

Expected: FAIL because expiration service does not exist.

**Step 3: Implement scheduler**

Install/register `@nestjs/schedule`. Run expiry on a fixed interval and expose `expireDueRecords(now)` for deterministic tests. Use conditional updates and transactions so multiple API instances cannot duplicate state transitions/audit events.

**Step 4: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- expiration`

Expected: expiry tests pass with no timers left open.

### Task 6: Build invitation management UI within the existing design system

**Files:**
- Create: `apps/web/src/lib/group-invites-contract.ts`
- Modify: `apps/web/src/lib/groups-api.ts`
- Create: `apps/web/src/app/app/grupos/[groupId]/group-invites-panel.tsx`
- Modify: `apps/web/src/app/app/grupos/[groupId]/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Required skills:** `godmode:ux-patterns`, `godmode:design-integration`, `godmode:ui-engineering`.

**Step 1: Define UI states before code**

- Semantic stacked email form with visible label and helper text.
- Empty, submitting, success, validation error, API error, populated, and inline revoke-confirmation states.
- Invitation status always shown as text, not color alone.
- Mobile layout stacks metadata/actions and preserves 44px touch targets.

**Step 2: Add server reads**

Load invitations and pending members only for `OWNER`/`ORGANIZER`, in parallel with existing detail data, using forwarded cookies and `cache: "no-store"`.

**Step 3: Add client mutations**

Create/revoke with `credentials: "include"`, accessible `aria-live`, `aria-invalid`, disabled loading actions, and `router.refresh()`.

**Step 4: Preserve current access rules**

Members must not receive management data or UI. Existing edit/member behavior remains unchanged.

**Step 5: Verify**

Run:

```text
pnpm --filter @bolao/web lint
pnpm --filter @bolao/web typecheck
```

Expected: both commands exit `0`.

### Task 7: Build authenticated invitation acceptance flow

**Files:**
- Create: `apps/web/src/app/convites/aceitar/page.tsx`
- Create: `apps/web/src/app/convites/aceitar/accept-invite-card.tsx`
- Create: `apps/web/src/app/convites/aceitar/loading.tsx`
- Create: `apps/web/src/app/convites/aceitar/error.tsx`
- Modify: `apps/web/src/app/entrar/page.tsx`
- Modify: `apps/web/src/app/entrar/auth-form.tsx`
- Modify: `apps/web/src/app/globals.css`

**Step 1: Preserve safe return path**

Accept only an internal `retorno` value beginning with `/convites/aceitar`; reject absolute/protocol-relative paths. Successful sign-in returns there instead of always `/app`.

**Step 2: Preserve the token outside the address bar**

The Client Component reads `#token=...`, removes the fragment immediately, and exchanges it for a `HttpOnly`, `SameSite=Strict` cookie restricted to `/api/group-invites`. Next.js route handlers proxy preview/accept calls and remove the invite cookie before forwarding the authentication cookie to the API.

**Step 3: Render safe states**

- no session: generic sign-in CTA without Group/target disclosure;
- valid intended account: Group name, issuer name, expiry, accept action;
- wrong account/invalid/revoked: generic unavailable message;
- expired: explicit expiration;
- accepted: explain pending identity validation and no private Group access;
- duplicate acceptance: same successful pending state.

**Step 4: Verify**

Run web lint/typecheck and focused E2E after Task 8 exists.

### Task 8: Add PostgreSQL-backed and Brave end-to-end coverage

**Files:**
- Create: `apps/api/test/group-invites.integration.spec.ts`
- Create: `apps/api/test/database.ts`
- Create: `e2e/group-invites.spec.ts`
- Create: `e2e/support/database.ts`
- Modify: `e2e/support/auth.ts`

**Step 1: Add integration tests against PostgreSQL**

Cover real unique constraints and concurrent acceptance with `Promise.allSettled`. Assert one pending row and one acceptance audit record.

**Step 2: Add Playwright flows**

Cover:

- Owner issues and revokes;
- Organizer issues;
- Member has no management UI and receives `403`;
- outsider receives `404`;
- intended account accepts and becomes pending;
- wrong account cannot accept and does not consume;
- pending account does not list/open the Group;
- expired/revoked invitation cannot be accepted;
- sequential retry is idempotent;
- audit rows have expected actions and no private token/email payload.

**Step 3: Verify focused flows**

Run:

```text
$env:DATABASE_URL_TEST="postgresql://bolao:bolao@localhost:5432/bolao?schema=public"
pnpm --filter @bolao/api test:integration
pnpm exec playwright test e2e/group-invites.spec.ts
```

Expected: focused integration and Brave E2E tests pass.

### Task 9: Update contract and project documentation

**Files:**
- Create: `apps/api/src/openapi.spec.ts`
- Modify: `README.md`
- Modify: `CONTEXT.md` only if wording needs clarification without changing domain rules
- Update vault files after implementation:
  - `C:\Users\jl\Documents\ANOTACOES\WEB BRAIN\PROJETOS\BOLÃO\00 - Índice do Projeto.md`
  - `C:\Users\jl\Documents\ANOTACOES\WEB BRAIN\PROJETOS\BOLÃO\01 - Visão Geral e Status.md`
  - `C:\Users\jl\Documents\ANOTACOES\WEB BRAIN\PROJETOS\BOLÃO\05 - Roadmap e Pendências.md`
  - `C:\Users\jl\Documents\ANOTACOES\WEB BRAIN\PROJETOS\BOLÃO\06 - Decisões e Histórico.md`
  - `C:\Users\jl\Documents\ANOTACOES\WEB BRAIN\PROJETOS\BOLÃO\07 - Handoff para Próxima Sessão.md`

**Step 1: Add OpenAPI contract test**

Assert invitation paths, cookie security scheme, DTO schemas, enums, and response codes.

**Step 2: Update operational documentation**

Document scheduler behavior, sandbox invitation email, token handling, pending-member semantics, and the next increment.

**Step 3: Verify**

Run: `pnpm --filter @bolao/api test -- openapi.spec.ts`

Expected: OpenAPI contract test passes.

### Task 10: Self-review, independent review, and complete gate

**Step 1: Self-review**

Inspect `git diff` for correctness, authorization order, private-data exposure, transaction boundaries, accessible states, responsive CSS, and unrelated changes. Preserve the pre-existing `apps/web/next-env.d.ts` modification.

**Step 2: Independent specification review**

Dispatch a review subagent to compare every canonical decision and task acceptance criterion against the diff.

**Step 3: Independent code-quality and security review**

Dispatch a second review subagent using `code-review-checklist` and `godmode:security-protocol`. Fix every blocking/high finding and re-run focused tests.

**Step 4: Complete gate**

Run fresh:

```text
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Expected: every command exits `0`, all Jest suites and all Brave E2E flows pass.

**Step 5: Browser validation**

Use the in-app Browser against the running local app at desktop and `390 x 844`. Verify keyboard focus, create/revoke/accept states, responsive layout, and absence of console errors.
