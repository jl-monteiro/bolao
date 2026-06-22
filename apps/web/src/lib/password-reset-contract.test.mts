import assert from "node:assert/strict";
import test from "node:test";

const contractUrl = new URL(
  "./password-reset-contract.ts",
  import.meta.url,
).href;
const {
  getPasswordResetApiErrorMessage,
  getPasswordResetRedirectTo,
  getPasswordResetRequestMessage,
  parsePasswordResetToken,
} = (await import(contractUrl)) as typeof import("./password-reset-contract");

test("builds the public reset callback URL", () => {
  assert.equal(
    getPasswordResetRedirectTo("http://localhost:3000"),
    "http://localhost:3000/redefinir-senha",
  );
});

test("accepts only URL-safe reset tokens", () => {
  assert.equal(parsePasswordResetToken("abc_DEF-123"), "abc_DEF-123");
  assert.equal(parsePasswordResetToken(" abc "), "abc");
  assert.equal(parsePasswordResetToken("abc def"), null);
  assert.equal(parsePasswordResetToken(""), null);
  assert.equal(parsePasswordResetToken(["abc"]), null);
});

test("keeps request feedback enumeration-safe", () => {
  assert.equal(
    getPasswordResetRequestMessage(true),
    "Se o e-mail existir, o link aparecera no terminal da API.",
  );
  assert.equal(
    getPasswordResetRequestMessage(false),
    "Se o e-mail existir, enviaremos um link para redefinir sua senha.",
  );
});

test("normalizes reset API errors", () => {
  assert.equal(
    getPasswordResetApiErrorMessage(
      { code: "INVALID_TOKEN" },
      "Falha generica.",
    ),
    "Link invalido ou expirado. Solicite uma nova redefinicao.",
  );
  assert.equal(
    getPasswordResetApiErrorMessage(
      { message: ["Erro principal.", "Outro erro."] },
      "Falha generica.",
    ),
    "Erro principal.",
  );
  assert.equal(
    getPasswordResetApiErrorMessage(
      { code: "PASSWORD_TOO_LONG" },
      "Falha generica.",
    ),
    "Use uma senha com no maximo 128 caracteres.",
  );
  assert.equal(
    getPasswordResetApiErrorMessage(null, "Falha generica."),
    "Falha generica.",
  );
});
