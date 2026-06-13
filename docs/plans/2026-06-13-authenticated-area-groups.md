# Authenticated Area and Groups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use godmode:task-runner to implement this plan task-by-task.

**Goal:** Deliver a verified-user flow from login to an authenticated app shell, then let the user create and access only their own Groups.

**Architecture:** Keep Better Auth hosted by NestJS and forward the incoming cookie headers from Next.js server components when reading the session. Protect Group endpoints with the existing global auth guard, model membership explicitly in Prisma, and enforce all Group isolation in backend queries. Render the initial Group list on the server and use a small client form for creation.

**Tech Stack:** Next.js 16, React 19, Better Auth 1.6.11, NestJS 11, Prisma 7, PostgreSQL 17, Jest 30, Playwright 1.60 with Brave.

---

### Task 1: Define the authenticated browser journey

**Files:**
- Modify: `e2e/auth.spec.ts`
- Create: `e2e/support/auth.ts`

**Step 1: Write the failing tests**

Add a deterministic helper that registers a unique user, confirms the verification record through PostgreSQL, and returns credentials. Add tests proving:

```ts
test("verified user signs in, sees their identity, and signs out", async ({ page }) => {
  const user = await createVerifiedUser();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByRole("textbox", { name: "Senha", exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/app");
  await expect(page.getByText(user.name)).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/entrar");
});

test("visitor cannot open the authenticated area", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL("/entrar");
});
```

**Step 2: Verify RED**

Run: `pnpm exec playwright test e2e/auth.spec.ts --grep "verified user|visitor cannot"`

Expected: FAIL because `/app` and logout do not exist and login remains on `/entrar`.

**Step 3: Keep the helper isolated**

Use the existing API registration endpoint and the existing database; do not add test-only production routes. Close database connections after each helper operation.

### Task 2: Implement server-side session access and route protection

**Files:**
- Create: `apps/web/src/lib/auth-session.ts`
- Modify: `apps/web/src/app/entrar/page.tsx`
- Modify: `apps/web/src/app/entrar/auth-form.tsx`
- Create: `apps/web/src/app/app/layout.tsx`
- Create: `apps/web/src/app/app/page.tsx`
- Create: `apps/web/src/app/app/logout-button.tsx`
- Modify: `apps/web/src/app/globals.css`

**Step 1: Use the failing E2E contract**

Keep Task 1 failing while implementing this task.

**Step 2: Add the server session helper**

Call:

```ts
authClient.getSession({
  fetchOptions: {
    headers: await headers(),
  },
});
```

Return the typed session or `null`. Use it from both `/entrar` and `/app`; do not authorize from client state.

**Step 3: Add route behavior**

- Redirect authenticated `/entrar` requests to `/app`.
- Redirect unauthenticated `/app` requests to `/entrar`.
- After successful login call `router.replace("/app")`.
- Sign out with `authClient.signOut()` and replace the route with `/entrar`.

**Step 4: Add the app shell**

Render the current user's name and email, a responsive header, navigation, logout, and an empty Group state using the existing design tokens.

**Step 5: Verify GREEN**

Run: `pnpm exec playwright test e2e/auth.spec.ts --grep "verified user|visitor cannot"`

Expected: PASS.

Run: `pnpm --filter @bolao/web lint && pnpm --filter @bolao/web typecheck`

Expected: both commands exit 0.

### Task 3: Model Group membership

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260613_add_groups/migration.sql`

**Step 1: Define the schema**

Add:

```prisma
enum GroupRole {
  OWNER
  ORGANIZER
  MEMBER
}

model Group {
  id          String            @id @default(cuid())
  name        String
  description String?
  image       String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  memberships GroupMembership[]
}

model GroupMembership {
  id        String    @id @default(cuid())
  role      GroupRole @default(MEMBER)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  groupId   String
  userId    String
  group     Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([userId])
}
```

Add the inverse `memberships` relation to `User`.

**Step 2: Generate and inspect the migration**

Run: `pnpm db:migrate -- --name add_groups`

Expected: Prisma creates the migration and applies it successfully.

Run: `pnpm db:generate`

Expected: generated client includes `Group`, `GroupMembership`, and `GroupRole`.

### Task 4: Define Group service behavior with unit tests

**Files:**
- Create: `apps/api/src/groups/dto/create-group.dto.ts`
- Create: `apps/api/src/groups/groups.service.spec.ts`
- Create: `apps/api/src/groups/groups.service.ts`

**Step 1: Write failing service tests**

Cover:

```ts
it("creates the group and OWNER membership atomically");
it("lists only memberships belonging to the current user");
it("returns a group only when the current user is a member");
it("hides a group from a non-member with NotFoundException");
```

Use a narrow Prisma mock matching the existing Jest style. Assert filters include `userId`.

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- groups.service.spec.ts`

Expected: FAIL because `GroupsService` does not exist.

**Step 3: Implement minimal service**

- Validate names with `@Length(3, 80)`.
- Allow an optional description up to 500 characters.
- Create the Group with a nested OWNER membership, which Prisma executes atomically.
- Query memberships by current `userId`.
- Query the composite membership key for detail access.
- Throw `NotFoundException("Grupo não encontrado.")` when membership is absent.

**Step 4: Verify GREEN**

Run: `pnpm --filter @bolao/api test -- groups.service.spec.ts`

Expected: all Group service tests pass.

### Task 5: Publish authenticated Group endpoints

**Files:**
- Create: `apps/api/src/groups/groups.controller.spec.ts`
- Create: `apps/api/src/groups/groups.controller.ts`
- Create: `apps/api/src/groups/groups.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing controller tests**

Prove that `POST /groups`, `GET /groups`, and `GET /groups/:groupId` pass `session.user.id` to the service and return its result.

**Step 2: Verify RED**

Run: `pnpm --filter @bolao/api test -- groups.controller.spec.ts`

Expected: FAIL because the controller does not exist.

**Step 3: Implement controller and OpenAPI**

Use `@Session() session: UserSession<typeof auth>`. Keep the controller protected by the existing global guard. Add `@ApiTags`, response types, validation metadata, and `@ApiBearerAuth` only if the generated contract actually uses bearer authentication; cookie auth remains authoritative.

**Step 4: Verify GREEN and contract**

Run: `pnpm --filter @bolao/api test -- groups`

Expected: service and controller tests pass.

Run the API and inspect `http://localhost:3001/openapi.json`.

Expected: all three Group paths and schemas are present.

### Task 6: Connect the authenticated UI to Groups

**Files:**
- Create: `apps/web/src/lib/groups-api.ts`
- Create: `apps/web/src/app/app/create-group-form.tsx`
- Modify: `apps/web/src/app/app/page.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `e2e/auth.spec.ts`

**Step 1: Write the failing E2E test**

Add a test that logs in, creates a Group, sees it in the list with the label `Proprietário`, reloads, and still sees it.

**Step 2: Verify RED**

Run: `pnpm exec playwright test e2e/auth.spec.ts --grep "creates a group"`

Expected: FAIL because the form and list are absent.

**Step 3: Implement the UI**

- Server-fetch `GET /v1/groups` with incoming headers and `cache: "no-store"`.
- Submit `POST /v1/groups` from the browser with `credentials: "include"`.
- Refresh the server-rendered list after creation.
- Show validation and API errors accessibly.
- Preserve keyboard focus, mobile layout, and the existing visual language.

**Step 4: Verify GREEN**

Run: `pnpm exec playwright test e2e/auth.spec.ts --grep "creates a group"`

Expected: PASS.

### Task 7: Prove backend isolation and complete verification

**Files:**
- Modify: `apps/api/src/groups/groups.service.spec.ts`
- Modify: `e2e/auth.spec.ts`

**Step 1: Add isolation tests**

Use two verified users. User A creates a Group; User B must not receive it from the list and must receive `404` for its detail endpoint.

**Step 2: Verify RED/GREEN**

Run the focused service/API test before and after the implementation adjustment, if any.

Expected: the test fails when the `userId` membership filter is removed and passes with it present.

**Step 3: Run all gates**

Run:

```powershell
pnpm db:generate
pnpm db:deploy
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Expected: every command exits 0.

**Step 4: Browser verification**

Open the local app in the in-app browser and verify desktop and mobile layouts, visible focus, login, Group creation, persistence, and logout. Confirm there are no browser console errors.
