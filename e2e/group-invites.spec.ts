import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import {
  addGroupMembership,
  createVerifiedUser,
  getGroupAuditLogs,
  getPendingMembershipCount,
  type VerifiedUser,
} from "./support/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CreatedGroup = {
  id: string;
};

type IssuedInvite = {
  acceptUrl: string;
  id: string;
};

function getInviteToken(acceptUrl: string): string {
  const url = new URL(acceptUrl);
  const token = new URLSearchParams(url.hash.slice(1)).get("token");

  if (!token) {
    throw new Error("A URL de aceite não contém token no fragmento.");
  }

  return token;
}

async function signIn(
  page: Page,
  user: VerifiedUser,
  returnTo = "/app",
) {
  const loginUrl =
    returnTo === "/app"
      ? "/entrar"
      : `/entrar?retorno=${encodeURIComponent(returnTo)}`;
  await page.goto(loginUrl);
  await page.getByLabel("E-mail").fill(user.email);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(returnTo);
}

async function createGroup(
  context: BrowserContext,
  name: string,
): Promise<CreatedGroup> {
  const response = await context.request.post(`${apiUrl}/v1/groups`, {
    data: {
      description: "Grupo usado no fluxo de Convites.",
      name,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as CreatedGroup;
}

async function issueInvite(
  context: BrowserContext,
  groupId: string,
  email: string,
): Promise<IssuedInvite> {
  const response = await context.request.post(
    `${apiUrl}/v1/groups/${groupId}/invites`,
    {
      data: {
        email,
      },
    },
  );
  expect(response.status()).toBe(201);
  return (await response.json()) as IssuedInvite;
}

test("Proprietário emite e revoga um Convite pela administração do Grupo", async ({
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const invited = await createVerifiedUser(request);
  const groupName = `Convites ${Date.now()}`;

  await signIn(page, owner);
  const group = await createGroup(page.context(), groupName);
  await page.goto(`/app/grupos/${group.id}`);

  const invitesRegion = page.getByRole("region", {
    name: "Convites",
  });
  await invitesRegion.getByLabel("E-mail da pessoa").fill(invited.email);
  await invitesRegion
    .getByRole("button", { name: "Enviar convite" })
    .click();

  await expect(invitesRegion.getByText(invited.email)).toBeVisible();
  await expect(
    invitesRegion.getByText("Pendente", { exact: true }),
  ).toBeVisible();

  await invitesRegion
    .getByRole("button", {
      name: `Revogar convite de ${invited.email}`,
    })
    .click();
  await invitesRegion
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();

  await expect(
    invitesRegion.getByText("Revogado", { exact: true }),
  ).toBeVisible();

  const logs = await getGroupAuditLogs(group.id);
  expect(logs.map(({ action }) => action)).toEqual([
    "GROUP_CREATED",
    "GROUP_INVITE_ISSUED",
    "GROUP_INVITE_REVOKED",
  ]);
  expect(JSON.stringify(logs)).not.toContain(invited.email);
  expect(JSON.stringify(logs)).not.toContain("token");
});

test("Organizador administra Convites e Membro comum recebe 403", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const organizer = await createVerifiedUser(request);
  const member = await createVerifiedUser(request);
  const invited = await createVerifiedUser(request);

  await signIn(page, owner);
  const group = await createGroup(page.context(), `Papéis ${Date.now()}`);
  await addGroupMembership(group.id, organizer.id, "ORGANIZER");
  await addGroupMembership(group.id, member.id, "MEMBER");

  const organizerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  try {
    const organizerPage = await organizerContext.newPage();
    await signIn(organizerPage, organizer);
    const organizerResponse = await organizerContext.request.post(
      `${apiUrl}/v1/groups/${group.id}/invites`,
      {
        data: {
          email: invited.email,
        },
      },
    );
    expect(organizerResponse.status()).toBe(201);

    const memberPage = await memberContext.newPage();
    await signIn(memberPage, member);
    await memberPage.goto(`/app/grupos/${group.id}`);
    await expect(
      memberPage.getByRole("region", { name: "Convites" }),
    ).toHaveCount(0);

    const memberResponse = await memberContext.request.post(
      `${apiUrl}/v1/groups/${group.id}/invites`,
      {
        data: {
          email: `blocked-${Date.now()}@bolao.local`,
        },
      },
    );
    expect(memberResponse.status()).toBe(403);
  } finally {
    await organizerContext.close();
    await memberContext.close();
  }
});

test("conta destinada aceita uma vez e permanece sem acesso como Membro Pendente", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const invited = await createVerifiedUser(request);
  const groupName = `Pendente ${Date.now()}`;

  await signIn(page, owner);
  const group = await createGroup(page.context(), groupName);
  const invite = await issueInvite(page.context(), group.id, invited.email);

  const invitedContext = await browser.newContext();
  try {
    const anonymousInvitePage = await invitedContext.newPage();
    await anonymousInvitePage.goto(invite.acceptUrl);
    await expect(
      anonymousInvitePage.getByRole("link", {
        name: "Entrar na minha conta",
      }),
    ).toBeVisible();
    await expect(anonymousInvitePage).toHaveURL("/convites/aceitar");

    const invitedPage = await invitedContext.newPage();
    await signIn(invitedPage, invited, "/convites/aceitar");

    await expect(
      invitedPage.getByRole("heading", { name: groupName }),
    ).toBeVisible();
    await invitedPage
      .getByRole("button", { name: "Aceitar convite" })
      .click();

    await expect(
      invitedPage.getByRole("status").filter({
        hasText: "Membro Pendente",
      }),
    ).toBeVisible();
    await expect(
      invitedPage.getByText("validação de identidade", { exact: false }),
    ).toBeVisible();

    const retryResponse = await invitedContext.request.post(
      `${apiUrl}/v1/group-invites/accept`,
      {
        data: {
          token: getInviteToken(invite.acceptUrl),
        },
      },
    );
    expect(retryResponse.status()).toBe(200);

    expect(await getPendingMembershipCount(group.id, invited.id)).toBe(1);

    const groupsResponse = await invitedContext.request.get(
      `${apiUrl}/v1/groups`,
    );
    const groups = (await groupsResponse.json()) as Array<{ id: string }>;
    expect(groups.some(({ id }) => id === group.id)).toBe(false);

    const groupResponse = await invitedContext.request.get(
      `${apiUrl}/v1/groups/${group.id}`,
    );
    expect(groupResponse.status()).toBe(404);

    const logs = await getGroupAuditLogs(group.id);
    expect(
      logs.filter(({ action }) => action === "GROUP_INVITE_ACCEPTED"),
    ).toHaveLength(1);
  } finally {
    await invitedContext.close();
  }
});

test("aceites concorrentes criam uma única pendência e auditoria", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const invited = await createVerifiedUser(request);

  await signIn(page, owner);
  const group = await createGroup(
    page.context(),
    `Concorrência ${Date.now()}`,
  );
  const invite = await issueInvite(page.context(), group.id, invited.email);
  const token = getInviteToken(invite.acceptUrl);

  const invitedContext = await browser.newContext();
  try {
    const invitedPage = await invitedContext.newPage();
    await signIn(invitedPage, invited);

    const [first, second] = await Promise.all([
      invitedContext.request.post(`${apiUrl}/v1/group-invites/accept`, {
        data: { token },
      }),
      invitedContext.request.post(`${apiUrl}/v1/group-invites/accept`, {
        data: { token },
      }),
    ]);

    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    expect(await getPendingMembershipCount(group.id, invited.id)).toBe(1);

    const logs = await getGroupAuditLogs(group.id);
    expect(
      logs.filter(({ action }) => action === "GROUP_INVITE_ACCEPTED"),
    ).toHaveLength(1);
  } finally {
    await invitedContext.close();
  }
});

test("conta errada não consome o Convite destinado a outra identidade", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const intended = await createVerifiedUser(request);
  const wrongUser = await createVerifiedUser(request);

  await signIn(page, owner);
  const group = await createGroup(page.context(), `Identidade ${Date.now()}`);
  const invite = await issueInvite(page.context(), group.id, intended.email);

  const wrongContext = await browser.newContext();
  const intendedContext = await browser.newContext();
  try {
    const wrongPage = await wrongContext.newPage();
    await signIn(wrongPage, wrongUser);
    await wrongPage.goto(invite.acceptUrl);
    await expect(
      wrongPage.getByText("Convite indisponível", { exact: false }),
    ).toBeVisible();
    await expect(
      wrongPage.getByRole("button", { name: "Aceitar convite" }),
    ).toHaveCount(0);

    const intendedPage = await intendedContext.newPage();
    await signIn(intendedPage, intended);
    await intendedPage.goto(invite.acceptUrl);
    await intendedPage
      .getByRole("button", { name: "Aceitar convite" })
      .click();
    await expect(
      intendedPage.getByRole("status").filter({
        hasText: "Membro Pendente",
      }),
    ).toBeVisible();

    expect(await getPendingMembershipCount(group.id, intended.id)).toBe(1);
    expect(await getPendingMembershipCount(group.id, wrongUser.id)).toBe(0);
  } finally {
    await wrongContext.close();
    await intendedContext.close();
  }
});
