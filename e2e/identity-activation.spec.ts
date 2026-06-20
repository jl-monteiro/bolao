import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import {
  createVerifiedUser,
  getGroupAuditLogs,
  getGroupMembershipCount,
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

function computeCpfCheckDigit(base: string): number {
  let sum = 0;

  for (let index = 0; index < base.length; index += 1) {
    sum += Number(base[index]) * (base.length + 1 - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function buildValidCpf(seed: number): string {
  const baseNumber = (seed % 900_000_000) + 100_000_000;
  const firstNineDigits = String(baseNumber).slice(0, 9);
  const firstCheckDigit = computeCpfCheckDigit(firstNineDigits);
  const secondCheckDigit = computeCpfCheckDigit(
    `${firstNineDigits}${firstCheckDigit}`,
  );

  return `${firstNineDigits}${firstCheckDigit}${secondCheckDigit}`;
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
      description: "Grupo usado no fluxo de ativação.",
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

test("conta convidada valida identidade e ativa a própria pendência", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const invited = await createVerifiedUser(request);
  const groupName = `Ativação ${Date.now()}`;
  const cpf = buildValidCpf(Date.now());

  await signIn(page, owner);
  const group = await createGroup(page.context(), groupName);
  const invite = await issueInvite(page.context(), group.id, invited.email);

  const invitedContext = await browser.newContext();
  try {
    const invitedPage = await invitedContext.newPage();
    await signIn(invitedPage, invited, "/app");
    await invitedPage.goto(invite.acceptUrl);
    await invitedPage
      .getByRole("button", { name: "Aceitar convite" })
      .click();
    await expect(
      invitedPage.getByRole("status").filter({
        hasText: "Membro Pendente",
      }),
    ).toBeVisible();

    await invitedPage.goto("/app");
    await invitedPage
      .getByRole("link", {
        name: `Validar identidade e ativar participação em ${groupName}`,
      })
      .click();

    await expect(
      invitedPage.getByRole("heading", { name: groupName }),
    ).toBeVisible();
    await invitedPage.getByLabel("Nome completo").fill("Maria da Silva");
    await invitedPage.getByLabel("Data de nascimento").fill("1990-05-15");
    await invitedPage.getByLabel("CPF").fill(cpf);
    await invitedPage
      .getByRole("button", { name: "Validar e ativar" })
      .click();

    await expect(invitedPage).toHaveURL(/\/app\?ativacao=concluida$/);
    await expect(
      invitedPage.getByRole("status").filter({
        hasText: "Associação ativada",
      }),
    ).toBeVisible();
    await expect(
      invitedPage.getByRole("link", { name: groupName }),
    ).toBeVisible();

    expect(await getGroupMembershipCount(group.id, invited.id)).toBe(1);
    expect(await getPendingMembershipCount(group.id, invited.id)).toBe(0);

    const logs = await getGroupAuditLogs(group.id);
    expect(
      logs.filter(({ action }) => action === "GROUP_MEMBERSHIP_ACTIVATED"),
    ).toHaveLength(1);
  } finally {
    await invitedContext.close();
  }
});
