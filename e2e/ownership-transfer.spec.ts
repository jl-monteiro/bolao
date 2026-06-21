import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { generateTotpCode } from "../apps/api/src/mfa/totp";
import {
  addGroupMembership,
  createVerifiedUser,
  getGroupAuditLogs,
  getGroupMembershipRole,
  type VerifiedUser,
} from "./support/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CreatedGroup = {
  id: string;
};

type MfaSetup = {
  secret: string;
};

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
      description: "Grupo usado no fluxo de transferência.",
      name,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as CreatedGroup;
}

async function enableMfa(context: BrowserContext): Promise<string> {
  const setupResponse = await context.request.post(
    `${apiUrl}/v1/me/mfa/totp/setup`,
  );
  expect(setupResponse.status()).toBe(201);
  const setup = (await setupResponse.json()) as MfaSetup;

  const confirmResponse = await context.request.post(
    `${apiUrl}/v1/me/mfa/totp/confirm`,
    {
      data: {
        code: generateTotpCode({
          now: new Date(),
          secret: setup.secret,
        }),
      },
    },
  );
  expect(confirmResponse.status()).toBe(200);

  return setup.secret;
}

test("Proprietário transfere propriedade para Membro com MFA", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const target = await createVerifiedUser(request);
  const groupName = `Transferência ${Date.now()}`;

  await signIn(page, owner);
  const group = await createGroup(page.context(), groupName);
  await addGroupMembership(group.id, target.id, "MEMBER");
  await page.goto(`/app/grupos/${group.id}`);

  await page.getByLabel("Novo Proprietário").selectOption({
    label: target.name,
  });
  await page
    .getByRole("button", { name: "Iniciar transferência" })
    .click();
  await expect(
    page.getByRole("status").filter({
      hasText: `Transferência enviada para ${target.name}.`,
    }),
  ).toBeVisible();

  const targetContext = await browser.newContext();
  try {
    const targetPage = await targetContext.newPage();
    await signIn(targetPage, target);
    const secret = await enableMfa(targetContext);
    await targetPage.goto("/app");

    await expect(
      targetPage.getByRole("heading", {
        name: /Transferências para você/,
      }),
    ).toBeVisible();
    await targetPage.getByLabel("Código MFA").fill(
      generateTotpCode({
        now: new Date(),
        secret,
      }),
    );
    await targetPage
      .getByRole("button", { name: "Aceitar propriedade" })
      .click();

    await expect(
      targetPage.getByRole("status").filter({
        hasText: "Propriedade transferida.",
      }),
    ).toBeVisible();
  } finally {
    await targetContext.close();
  }

  await expect(getGroupMembershipRole(group.id, target.id)).resolves.toBe(
    "OWNER",
  );
  await expect(getGroupMembershipRole(group.id, owner.id)).resolves.toBe(
    "ORGANIZER",
  );

  const logs = await getGroupAuditLogs(group.id);
  expect(logs.map(({ action }) => action)).toContain(
    "GROUP_OWNERSHIP_TRANSFER_REQUESTED",
  );
  expect(logs.map(({ action }) => action)).toContain(
    "GROUP_OWNERSHIP_TRANSFER_ACCEPTED",
  );
});
