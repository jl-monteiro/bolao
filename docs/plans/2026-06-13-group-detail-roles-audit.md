# Group Detail, Roles, and Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Let a Group member open its detail and member list, let Owners and Organizers edit allowed fields, reject Members, and persist immutable audit records for Group creation and updates.

**Architecture:** Keep session identity and Group isolation in the NestJS service layer. Add a reusable role policy, write audit records in the same Prisma transaction as each administrative mutation, and expose only member name, image, role, and membership metadata. Render detail data in a Next.js Server Component and isolate editing in a small Client Component.

**Tech Stack:** NestJS 11, Prisma 7.6, PostgreSQL 17, Next.js 16.2, React 19.2, Jest 30, Playwright 1.60 with Brave.

---

### Task 1: Define reusable Group role policy

**Files:**
- Create: `apps/api/src/groups/group-role.policy.spec.ts`
- Create: `apps/api/src/groups/group-role.policy.ts`
- Modify: `apps/api/src/groups/groups.module.ts`

**Step 1: Write the failing tests**

Cover that `OWNER` and `ORGANIZER` can update Group details and that `MEMBER` receives `ForbiddenException`.

```ts
expect(() => policy.assertCanUpdate(GroupRole.OWNER)).not.toThrow();
expect(() => policy.assertCanUpdate(GroupRole.ORGANIZER)).not.toThrow();
expect(() => policy.assertCanUpdate(GroupRole.MEMBER)).toThrow(
  new ForbiddenException("Você não pode editar este Grupo."),
);
```

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- group-role.policy.spec.ts`

Expected: FAIL because `GroupRolePolicy` does not exist.

**Step 3: Implement the minimal policy**

Create an injectable `GroupRolePolicy` with the single method `assertCanUpdate(role)`. Keep role knowledge out of controllers and register the policy as a provider in `GroupsModule`.

**Step 4: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- group-role.policy.spec.ts`

Expected: 3 tests pass.

### Task 2: Model immutable Group audit records

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_group_audit/migration.sql`
- Modify: `apps/api/src/groups/groups.service.spec.ts`
- Modify: `apps/api/src/groups/groups.service.ts`

**Step 1: Extend failing creation tests**

Require Group creation to use a Prisma transaction and create:

```ts
{
  action: "GROUP_CREATED",
  actorId: "user-1",
  groupId: "group-1",
  previousValues: null,
  newValues: {
    name: "Copa 2026",
    description: "Amigos da Copa",
  },
}
```

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- groups.service.spec.ts`

Expected: FAIL because the audit model and transaction behavior do not exist.

**Step 3: Add schema and migration**

Add `AuditAction` with `GROUP_CREATED` and `GROUP_UPDATED`. Add `AuditLog` with `id`, `action`, `actorId`, `groupId`, nullable JSON `previousValues`, nullable JSON `newValues`, and `createdAt`. Add indexes for Group chronology and actor. Use restrictive foreign keys because audit history must not cascade away.

**Step 4: Implement atomic creation audit**

Use `prisma.$transaction(async (transaction) => ...)` so Group creation, Owner membership, and `GROUP_CREATED` audit either all persist or all roll back.

**Step 5: Verify GREEN**

Run:

```text
pnpm db:generate
pnpm --filter @bolao/api test -- groups.service.spec.ts
```

Expected: Prisma generates and Group service tests pass.

### Task 3: Publish member listing without private data

**Files:**
- Create: `apps/api/src/groups/dto/group-member-response.dto.ts`
- Modify: `apps/api/src/groups/groups.service.spec.ts`
- Modify: `apps/api/src/groups/groups.service.ts`
- Modify: `apps/api/src/groups/groups.controller.spec.ts`
- Modify: `apps/api/src/groups/groups.controller.ts`

**Step 1: Write failing tests**

Require `listMembers(userId, groupId)` to:

- verify the requester with composite `(groupId, userId)`;
- return `404` when the requester is not a member;
- query memberships only for `groupId`;
- select `user.name` and `user.image`, never email;
- order by membership creation time.

Require `GET /groups/:groupId/members` to forward `session.user.id`.

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- groups`

Expected: FAIL because the service/controller methods do not exist.

**Step 3: Implement the endpoint and OpenAPI**

Return:

```ts
type GroupMemberResult = {
  id: string;
  name: string;
  image: string | null;
  role: GroupRole;
  joinedAt: Date;
};
```

Document cookie authentication, `200`, `401`, and hidden-resource `404`.

**Step 4: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- groups`

Expected: all Group tests pass.

### Task 4: Implement authorized Group updates and audit

**Files:**
- Create: `apps/api/src/groups/dto/update-group.dto.ts`
- Modify: `apps/api/src/groups/groups.service.spec.ts`
- Modify: `apps/api/src/groups/groups.service.ts`
- Modify: `apps/api/src/groups/groups.controller.spec.ts`
- Modify: `apps/api/src/groups/groups.controller.ts`

**Step 1: Write failing tests**

Cover:

- Owner updates name and description;
- Organizer updates name and description;
- Member receives `403`;
- outsider receives `404`;
- update and `GROUP_UPDATED` audit use one transaction;
- audit stores only Group fields before and after;
- controller forwards the session user to `PATCH /groups/:groupId`.

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- groups`

Expected: FAIL because update behavior does not exist.

**Step 3: Implement minimal update behavior**

Validate trimmed name length `3..80`, optional description up to `500`, and allow blank description to become `null`. Inside one transaction, load membership and Group, call `GroupRolePolicy.assertCanUpdate`, update allowed fields, then create the audit record.

**Step 4: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- groups`

Expected: all Group tests pass.

### Task 5: Define the browser journey for Group detail

**Files:**
- Modify: `e2e/support/auth.ts`
- Modify: `e2e/auth.spec.ts`

**Step 1: Write failing E2E tests**

Cover:

- clicking a Group card opens `/app/grupos/:groupId`;
- the page shows Group description, current role, members, and their roles;
- Owner edits name/description and the values persist after reload;
- a seeded Organizer can edit;
- a seeded Member sees no edit form and direct `PATCH` receives `403`;
- outsider detail still returns `404`;
- creation and update audit rows exist with expected actions and JSON.

**Step 2: Verify RED**

Run: `pnpm exec playwright test e2e/auth.spec.ts --grep "detalhe|edita|auditoria"`

Expected: FAIL because cards are not links and the detail route/edit flow do not exist.

### Task 6: Implement Group detail and edit UI

**Files:**
- Modify: `apps/web/src/lib/groups-api.ts`
- Modify: `apps/web/src/app/app/page.tsx`
- Create: `apps/web/src/app/app/grupos/[groupId]/page.tsx`
- Create: `apps/web/src/app/app/grupos/[groupId]/edit-group-form.tsx`
- Create: `apps/web/src/app/app/grupos/[groupId]/not-found.tsx`
- Modify: `apps/web/src/app/globals.css`

**Step 1: Add server API helpers**

Add `getGroup(groupId)` and `getGroupMembers(groupId)` with forwarded cookies and `cache: "no-store"`. Treat `404` as not found without exposing whether the Group exists.

**Step 2: Link cards and render detail**

Use `/app/grupos/[groupId]`, fetch Group and members in parallel, call `notFound()` for hidden resources, and render the role labels already established by the dashboard.

**Step 3: Add authorized editing UI**

Render `EditGroupForm` only for `OWNER` and `ORGANIZER`. Submit `PATCH` with browser credentials, show accessible errors, refresh server data after success, and keep Members read-only.

**Step 4: Verify GREEN**

Run:

```text
pnpm --filter @bolao/web lint
pnpm --filter @bolao/web typecheck
pnpm exec playwright test e2e/auth.spec.ts --grep "detalhe|edita|auditoria"
```

Expected: all focused checks pass.

### Task 7: Complete contract and quality gates

**Files:**
- Inspect: `http://localhost:3001/openapi.json`
- Modify tests or DTO metadata only if contract gaps are found.

**Step 1: Apply migration locally**

Run:

```text
pnpm db:generate
pnpm db:deploy
```

Expected: all migrations apply and the generated client includes `AuditLog` and `AuditAction`.

**Step 2: Run the complete gate**

Run:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Expected: every command exits `0`.

**Step 3: Validate Brave desktop and mobile**

Open the detail route at desktop and `390 x 844`, verify keyboard focus, member list, editing permissions, persistence, and absence of console errors.

**Step 4: Commit**

Run:

```text
git add --all
git commit -m "feat: add group detail roles and audit"
```

