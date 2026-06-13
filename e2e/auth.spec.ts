import { expect, test } from "@playwright/test";

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
