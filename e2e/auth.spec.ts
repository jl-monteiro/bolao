import { expect, test } from "@playwright/test";

test("visitante abre autenticacao e recebe aviso de confirmacao", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Entrar" }).click();

  await expect(page).toHaveURL("/entrar");
  await expect(
    page.getByRole("heading", { name: "Entre no seu bolao" }),
  ).toBeVisible();
  await expect(
    page.getByText("Voce precisara confirmar seu e-mail antes de entrar."),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
});

test("visitante cria conta e recebe instrucao para confirmar e-mail", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@bolao.local`;

  await page.goto("/entrar");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.getByLabel("Nome").fill("Teste E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar minha conta" }).click();

  await expect(
    page.getByRole("status").filter({
      hasText:
        "Conta criada. No sandbox, abra o link exibido no terminal da API.",
    }),
  ).toBeVisible();
});

test("usuario recebe confirmacao visual depois de verificar o e-mail", async ({
  page,
}) => {
  await page.goto("/entrar?verificado=1");

  await expect(
    page.getByRole("status").filter({
      hasText: "E-mail confirmado. Agora voce pode entrar.",
    }),
  ).toBeVisible();
});
