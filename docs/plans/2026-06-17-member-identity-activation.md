# Member identity validation and pending membership activation

> **For agentic workers:** REQUIRED SUBKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

Goal: Let an account that accepted an invitation supply a validated identity (full name + birth date + CPF), persist it on the User, and activate its own `GroupPendingMembership` into a `GroupMembership` with role `MEMBER`. Audit the transition atomically and keep the lifecycle check invariant.

## Canonical decisions

- Identity is **self-declared in this milestone**. No external provider, no Receita Federal call.
- CPF is validated by checksum (11 digits, mod-11), normalised to digits-only lowercase.
- The user must be 18+ at submission; `birthDate` must be a real past ISO date.
- `emailVerified = true` is required (already enforced by guard).
- Activation targets only the authenticated user's pending memberships and only when `status='PENDING'` and `expiresAt > now()`. Concurrent activations on the same row are idempotent (a single `GroupMembership` is created and the row stays in `ACTIVATED`).
- Activation is forbidden for an already-`ACTIVATED` or `-EXPIRED` pending row.
- The activated `GroupMembership` role is `MEMBER` (not ORGANIZER).
- `User.identityValidatedAt` is set once and never cleared by this milestone.
- The transaction is the one Prisma `$transaction` over both the membership create and the pending row update; audit row inserted in the same transaction.
- Portuguese error messages and audit row keys.

## File structure

| Path | Responsibility |
|---|---|
| `apps/api/prisma/schema.prisma` | add `birthDate`, `cpf`, `identityValidatedAt` to `User` |
| `apps/api/prisma/migrations/20260617090000_add_user_identity` | migration that adds the three columns, a unique constraint on `cpf`, and a check on `birthDate` |
| `apps/api/src/identity/cpf.ts` | CPF checksum + normalisation helpers |
| `apps/api/src/identity/identity.service.ts` | validates CPF, +18, persists on User |
| `apps/api/src/identity/identity.service.spec.ts` | unit tests for the validator |
| `apps/api/src/identity/dto/submit-identity.dto.ts` | request DTO with field-level validation |
| `apps/api/src/identity/dto/submit-identity.dto.spec.ts` | DTO decl + guard tests |
| `apps/api/src/groups/pending-membership-activation.service.ts` | atomic activation of pending membership |
| `apps/api/src/groups/pending-membership-activation.service.spec.ts` | unit tests |
| `apps/api/src/groups/me.controller.ts` | add two routes: `me/identity`, `me/pending-memberships/:pendingId/activate` |
| `apps/api/src/groups/groups/groups.module.ts` | wire identity + activation services |
| `apps/api/src/openapi.ts` | extend OpenAPI schema to include the new endpoints |
| `apps/api/test/identity-activation.integration.spec.ts` | Postgres-backed integration coverage |
| `apps/web/src/lib/identity-contract.test.mts` | typed contracts + checks |
| `apps/web/src/lib/identity-api.ts` | fetchers (`submitIdentity`, `activatePendingMembership`) |
| `apps/web/src/app/app/me-pending-memberships-section.tsx` | mirror section exposes CTA per row |
| `apps/web/src/app/ativar-membro/[pendingId]/page.tsx` | simple form route for identity submission + activate |
| `apps/web/src/app/ativar-membro/[pendingId]/identity-form.tsx` | client component with shadcn primitives |
| `apps/web/src/app/ativar-membro/[pendingId]/activate-action.ts` | server action wiring DTOs to fetchers |
| `e2e/identity-activation.spec.ts` | Playwright coverage (issue → accept → declare → activate) |
| `apps/api/src/auth/auth.ts` | `identityValidatedAt` exposure on session if helpful |
| `docs/plans/2026-06-17-member-identity-activation.md` | this file |

Out of scope:

- Integration with Receita Federal or any external ID provider.
- Promotion paths (`ORGANIZER` role, transfer of ownership), MFA.
- Bolões or any payment behaviour.

## Identity rules

- CPF: 11 digits, `0..9` only. Checksum (mod-11) of the second verifier digit must match.
- Birth date: past, calculated in UTC; age must be `>= 18` at the instant of submission (clock injected for tests).
- Full name: keep current `User.name` write path; require update via DTO. Trimming, then `>= 2` chars, then `>= 2` separated tokens.
- Persistence: `User.cpf` is normalised; unique over all users; stored as digits only.
- Audit: on first successful submission, write `AuditLog` with `action='GROUP_IDENTITY_VALIDATED'` would overload semantics; this milestone emits no audit on identity submission alone. Activation writes `GROUP_MEMBERSHIP_ACTIVATED` (new `AuditAction` enum value).

## Atomic activation path

Inside a single `$transaction`:

1. Load pending membership by id and `where: { userId, status: 'PENDING', expiresAt > now }`.
   - If not found → `404 not found` (the row is not yours is also `404`).
   - If `status='ACTIVATED'` → return the already-active state idempotently (still return 200 with the membership id).
   - If `status='EXPIRED'` → throw `GoneException`.
2. Insert `GroupMembership(groupId, userId, role='MEMBER')`.
3. Update `GroupPendingMembership(status='ACTIVATED', activatedAt=now, activatedMembershipId=newMembership.id)`.
4. Insert `AuditLog(action='GROUP_MEMBERSHIP_ACTIVATED', actorType='USER', actorId=userId, groupId, previousValues = pending snapshot, newValues = membership snapshot)`.
5. Return the membership.

The lifecycle `CHECK` ensures `activatedAt IS NULL AND activatedMembershipId IS NULL` for `PENDING`. The transition respects it: no row leaves `PENDING` unless `activatedAt` and `activatedMembershipId` are set together.

## Tasks

### Task 1: User identity columns and migration

Modify `apps/api/prisma/schema.prisma` to add `birthDate`, `cpf` (unique), `identityValidatedAt` to `User`.

- [x] Add stats on User.
- [x] Create migration `20260617090000_add_user_identity` with `ALTER TABLE` statements (DRAFT, will run test).

### Task 2: CPF helper

Create `apps/api/src/identity/cpf.ts`.

- [x] Write `isValidCpf(input)` with checksum.
- [x] Write `normaliseCpf(input)` returning digits-only.

### Task 3: SubmitIdentityDto

Create `apps/api/src/identity/dto/submit-identity.dto.ts`.

- [x] Validate `fullName` non-empty after trim, two separated tokens.
- [x] Validate `birthDate` ISO date.
- [x] Validate `cpf` checksum.

### Task 4: IdentityService

Create `apps/api/src/identity/identity.service.ts`.

- [x] Validate input.
- [x] Update `User` with normalised CPF, birth date, latest name.
- [x] Set `identityValidatedAt = now()` only if currently null.

### Task 5: PendingMembershipActivationService

Create `apps/api/src/groups/pending-membership-activation.service.ts`.

- [x] Activate PENDING only.
- [x] Treat already-ACTIVATED as idempotent return.
- [x] Reject EXPIRED with GoneException.
- [x] Atomic transaction creates membership + updates pending + audit.
- [x] Audit uses new action.

### Task 6: AuditAction extension

Add `GROUP_MEMBERSHIP_ACTIVATED` to enum and ensure OpenAPI/existing references handle it.

- [x] Add enum value and OpenAPI coverage.
- [x] Remove legacy administrative activation route from the invitations surface.

### Task 7: MeController routes

Add `POST /v1/me/identity` and `POST /v1/me/pending-memberships/:pendingId/activate`. Wire dependencies.

- [x] Wire identity and activation services in `GroupsModule`.
- [x] Document `/v1/me/identity` and `/v1/me/pending-memberships/:pendingId/activate`.

### Task 8: Integration spec

Postgres-backed coverage of identity submit + activate + idempotency + isolation.

- [x] Cover identity submit + atomic activation + audit.
- [x] Cover duplicate/concurrent activation.
- [x] Cover CPF conflict and non-owned activation.

### Task 9: Web form

Identity form under `/ativar-membro/[pendingId]`, server action.

- [x] Add `/ativar-membro/[pendingId]`.
- [x] Add server action calling `submitIdentity` then `activatePendingMembership`.
- [x] Add dashboard CTA for each pending membership.
- [x] Redirect to `/app?ativacao=concluida` after success.

### Task 10: E2E spec

Playwright coverage.

- [x] Add E2E for invite accept → pending CTA → identity submit → activation.
- [x] Generate unique valid CPF in the E2E to avoid cross-run conflicts.

### Task 11: Gate

Lint, types, unit + integration, build, e2e.

- [x] API lint, typecheck, unit tests.
- [x] API integration tests with `DATABASE_URL_TEST`.
- [x] Web lint, typecheck, contract tests.
- [x] Monorepo build.
- [x] Full Playwright E2E in Brave.
- [x] Desktop/mobile visual check of activation form.

## acceptance criteria

- [x] An account with `emailVerified=true` can submit identity and have `User.identityValidatedAt` set.
- [x] Same account can activate a PENDING membership and become GroupMembership(MEMBER) atomically.
- [x] Repeat activation on the same pending returns idempotently without duplicating membership.
- [x] Activation of EXPIRED or non-owned pending returns 404/410 without mutations.
- [x] Audit row exists in same transaction.
- [x] CPF checksum: `111.444.777-35` accepts; invalid verifier digits reject.
- [x] Under-18 birth date rejects; over-18 accepts.
- [x] Concurrent activation: only one membership created.

## Status

- 2026-06-18: API implementation exists in commits `877f481..9f22cda` on `feat/member-activation`.
- 2026-06-18: Current working tree completes the web activation flow, removes the legacy administrative activation endpoint, preserves the first `identityValidatedAt`, and adds full E2E coverage.
- Gate run on 2026-06-18: API lint/typecheck/unit, API integration with `DATABASE_URL_TEST=postgresql://bolao:bolao@localhost:5432/bolao?schema=public`, web lint/typecheck/tests, monorepo build, and 17 Playwright E2E tests passed.
- Local visual QA: activation form captured in Brave at 1440x900 and 390x844; contrast adjusted for help text.
- Pending before integration: review, stage, commit this working tree, then push/open PR or merge `feat/member-activation`.
