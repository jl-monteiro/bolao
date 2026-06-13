import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  addGroupMembership,
  createVerifiedUser,
  getGroupAuditLogs,
  type VerifiedUser,
} from "./support/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function signIn(page: Page, user: VerifiedUser) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/app");
}

test("visitante abre autenticação pela navegação principal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/entrar");
  await expect(
    page.getByRole("heading", { name: "Entre no seu bolão." }),
  ).toBeVisible();
  await expect(
    page.getByText("E-mail confirmado antes do primeiro acesso."),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Senha", exact: true }),
  ).toBeVisible();
});

test("CTA principal abre cadastro e visitante cria conta", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@bolao.local`;

  await page.goto("/");
  await page.getByRole("link", { name: "Criar meu grupo" }).click();

  await expect(page).toHaveURL("/entrar?modo=cadastro");
  await expect(
    page.getByRole("heading", { name: "Comece seu primeiro bolão" }),
  ).toBeVisible();

  await page.getByLabel("Nome").fill("Teste E2E");
  await page.getByLabel("E-mail").fill(email);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar minha conta" }).click();

  await expect(
    page.getByRole("status").filter({
      hasText:
        "Conta criada. No sandbox, abra o link exibido no terminal da API.",
    }),
  ).toBeVisible();
});

test("cadastro informa quando a API está indisponível", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/v1/auth/sign-up/email", (route) => route.abort());

  await page.goto("/entrar?modo=cadastro");
  await page.getByLabel("Nome").fill("Teste sem API");
  await page.getByLabel("E-mail").fill(`offline-${Date.now()}@bolao.local`);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar minha conta" }).click();

  await expect(
    page.getByRole("alert").filter({
      hasText:
        "Não foi possível conectar ao servidor. Confirme se a API está em execução e tente novamente.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar minha conta" }),
  ).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test("usuário recebe confirmação visual depois de verificar o e-mail", async ({
  page,
}) => {
  await page.goto("/entrar?verificado=1");

  await expect(
    page.getByRole("status").filter({
      hasText: "E-mail confirmado. Agora você pode entrar.",
    }),
  ).toBeVisible();
});

test("visitante não acessa a área autenticada", async ({ page }) => {
  await page.goto("/app");

  await expect(page).toHaveURL("/entrar");
});

test("usuário verificado entra, vê sua identidade e sai", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  const serverErrors: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/app");
  await expect(page.getByText(user.name)).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();

  await page.goto("/entrar");
  await expect(page).toHaveURL("/app");

  await page.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL("/entrar");
  await page.waitForLoadState("networkidle");
  expect(serverErrors).toEqual([]);
});

test("usuário cria um Grupo e mantém a listagem após recarregar", async ({
  page,
  request,
}) => {
  const user = await createVerifiedUser(request);
  const groupName = `Amigos ${Date.now()}`;

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/app");

  await page.getByRole("button", { name: "Criar grupo" }).click();
  await page.getByLabel("Nome do Grupo").fill(groupName);
  await page
    .getByLabel("Descrição")
    .fill("Grupo criado pelo fluxo E2E.");
  await page
    .getByRole("button", { name: "Confirmar criação" })
    .click();

  await expect(
    page.getByRole("heading", { name: groupName }),
  ).toBeVisible();
  await expect(page.getByText("Proprietário")).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: groupName }),
  ).toBeVisible();
  await expect(page.getByText("Proprietário")).toBeVisible();
});

test("usuário não lista nem acessa Grupo alheio", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const groupName = `Privado ${Date.now()}`;

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(owner.email);
  await page
    .getByRole("textbox", { name: "Senha", exact: true })
    .fill(owner.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/app");

  await page.getByRole("button", { name: "Criar grupo" }).click();
  await page.getByLabel("Nome do Grupo").fill(groupName);
  await page
    .getByRole("button", { name: "Confirmar criação" })
    .click();
  await expect(
    page.getByRole("heading", { name: groupName }),
  ).toBeVisible();

  const ownerGroupsResponse = await page
    .context()
    .request.get(`${apiUrl}/v1/groups`);
  expect(ownerGroupsResponse.ok()).toBe(true);
  const ownerGroups = (await ownerGroupsResponse.json()) as Array<{
    id: string;
    name: string;
  }>;
  const privateGroup = ownerGroups.find(
    (group) => group.name === groupName,
  );
  expect(privateGroup).toBeDefined();
  if (!privateGroup) {
    throw new Error("Grupo criado não apareceu na listagem do proprietário.");
  }

  const outsider = await createVerifiedUser(request);
  const outsiderContext = await browser.newContext();

  try {
    const outsiderPage = await outsiderContext.newPage();
    await outsiderPage.goto("/entrar");
    await outsiderPage.getByLabel("E-mail").fill(outsider.email);
    await outsiderPage
      .getByRole("textbox", { name: "Senha", exact: true })
      .fill(outsider.password);
    await outsiderPage.getByRole("button", { name: "Entrar" }).click();
    await expect(outsiderPage).toHaveURL("/app");

    const outsiderGroupsResponse = await outsiderContext.request.get(
      `${apiUrl}/v1/groups`,
    );
    expect(outsiderGroupsResponse.ok()).toBe(true);
    const outsiderGroups = (await outsiderGroupsResponse.json()) as Array<{
      id: string;
    }>;
    expect(
      outsiderGroups.some((group) => group.id === privateGroup.id),
    ).toBe(false);

    const directAccessResponse = await outsiderContext.request.get(
      `${apiUrl}/v1/groups/${privateGroup.id}`,
    );
    expect(directAccessResponse.status()).toBe(404);
  } finally {
    await outsiderContext.close();
  }
});

test("membro abre o detalhe do Grupo e vê os papéis", async ({
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const member = await createVerifiedUser(request);
  const groupName = `Detalhe ${Date.now()}`;

  await signIn(page, owner);
  const createResponse = await page.context().request.post(
    `${apiUrl}/v1/groups`,
    {
      data: {
        description: "Grupo com membros visíveis.",
        name: groupName,
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  const group = (await createResponse.json()) as { id: string };
  await addGroupMembership(group.id, member.id, "MEMBER");

  await page.goto("/app");
  await page.getByRole("link", { name: groupName }).click();

  await expect(page).toHaveURL(`/app/grupos/${group.id}`);
  await expect(
    page.getByRole("heading", { name: groupName }),
  ).toBeVisible();
  await expect(page.getByTestId("group-description")).toHaveText(
    "Grupo com membros visíveis.",
  );
  const membersRegion = page.getByRole("region", {
    name: "Membros do Grupo",
  });
  await expect(membersRegion.getByText("Proprietário")).toBeVisible();
  await expect(
    membersRegion.getByText("Membro", { exact: true }),
  ).toBeVisible();
  await expect(membersRegion.getByText(owner.name)).toBeVisible();
});

test("Proprietário e Organizador editam o Grupo com auditoria", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const organizer = await createVerifiedUser(request);
  const originalName = `Auditoria ${Date.now()}`;

  await signIn(page, owner);
  const createResponse = await page.context().request.post(
    `${apiUrl}/v1/groups`,
    {
      data: {
        description: "Descrição original",
        name: originalName,
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  const group = (await createResponse.json()) as { id: string };
  await addGroupMembership(group.id, organizer.id, "ORGANIZER");

  await page.goto(`/app/grupos/${group.id}`);
  await page.getByLabel("Nome do Grupo").fill("Nome do Proprietário");
  await page
    .getByLabel("Descrição do Grupo")
    .fill("Atualizada pelo Proprietário");
  await page
    .getByRole("button", { name: "Salvar alterações" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nome do Proprietário" }),
  ).toBeVisible();

  const organizerContext = await browser.newContext();
  try {
    const organizerPage = await organizerContext.newPage();
    await signIn(organizerPage, organizer);
    await organizerPage.goto(`/app/grupos/${group.id}`);
    await organizerPage
      .getByLabel("Nome do Grupo")
      .fill("Nome do Organizador");
    await organizerPage
      .getByLabel("Descrição do Grupo")
      .fill("Atualizada pelo Organizador");
    await organizerPage
      .getByRole("button", { name: "Salvar alterações" })
      .click();
    await expect(
      organizerPage.getByRole("heading", {
        name: "Nome do Organizador",
      }),
    ).toBeVisible();
    await organizerPage.reload();
    await expect(
      organizerPage.getByTestId("group-description"),
    ).toHaveText("Atualizada pelo Organizador");
  } finally {
    await organizerContext.close();
  }

  const logs = await getGroupAuditLogs(group.id);
  expect(logs).toHaveLength(3);
  expect(logs[0]).toMatchObject({
    action: "GROUP_CREATED",
    actorId: owner.id,
    newValues: {
      description: "Descrição original",
      name: originalName,
    },
    previousValues: null,
  });
  expect(logs[1]).toMatchObject({
    action: "GROUP_UPDATED",
    actorId: owner.id,
    previousValues: {
      description: "Descrição original",
      name: originalName,
    },
  });
  expect(logs[2]).toMatchObject({
    action: "GROUP_UPDATED",
    actorId: organizer.id,
    newValues: {
      description: "Atualizada pelo Organizador",
      name: "Nome do Organizador",
    },
  });
});

test("Membro consulta o Grupo, mas não edita", async ({
  browser,
  page,
  request,
}) => {
  const owner = await createVerifiedUser(request);
  const member = await createVerifiedUser(request);

  await signIn(page, owner);
  const createResponse = await page.context().request.post(
    `${apiUrl}/v1/groups`,
    {
      data: {
        name: `Somente leitura ${Date.now()}`,
      },
    },
  );
  const group = (await createResponse.json()) as { id: string };
  await addGroupMembership(group.id, member.id, "MEMBER");

  const memberContext = await browser.newContext();
  try {
    const memberPage = await memberContext.newPage();
    await signIn(memberPage, member);
    await memberPage.goto(`/app/grupos/${group.id}`);

    await expect(
      memberPage.getByRole("button", { name: "Salvar alterações" }),
    ).toHaveCount(0);
    await expect(memberPage.getByText("Acesso de leitura")).toBeVisible();

    const response = await memberContext.request.patch(
      `${apiUrl}/v1/groups/${group.id}`,
      {
        data: {
          name: "Alteração indevida",
        },
      },
    );
    expect(response.status()).toBe(403);
  } finally {
    await memberContext.close();
  }
});
