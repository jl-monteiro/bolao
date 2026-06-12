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
