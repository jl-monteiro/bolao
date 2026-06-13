import { expect, test } from "@playwright/test";
import { createVerifiedUser } from "./support/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
