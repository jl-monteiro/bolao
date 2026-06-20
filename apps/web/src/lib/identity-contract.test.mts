import assert from "node:assert/strict";
import test from "node:test";

const contractUrl = new URL("./identity-contract.ts", import.meta.url).href;
const {
  buildMemberActivationLoginHref,
  buildMemberActivationPath,
  getIdentityApiErrorMessage,
  isSafeMemberActivationPath,
} = (await import(contractUrl)) as typeof import("./identity-contract");

test("builds member activation paths without exposing another return target", () => {
  assert.equal(
    buildMemberActivationPath("pending_123-ABC"),
    "/ativar-membro/pending_123-ABC",
  );
  assert.equal(
    buildMemberActivationLoginHref("pending_123-ABC"),
    "/entrar?retorno=%2Fativar-membro%2Fpending_123-ABC",
  );
});

test("validates member activation return paths by a single safe segment", () => {
  assert.equal(isSafeMemberActivationPath("/ativar-membro/pending-1"), true);
  assert.equal(isSafeMemberActivationPath("/ativar-membro/pending_1"), true);
  assert.equal(isSafeMemberActivationPath("/ativar-membro/pending/1"), false);
  assert.equal(
    isSafeMemberActivationPath("/ativar-membro/pending-1?next=/app"),
    false,
  );
  assert.equal(isSafeMemberActivationPath("//example.com"), false);
});

test("normalizes identity API error messages", () => {
  assert.equal(
    getIdentityApiErrorMessage(
      { message: ["CPF inválido.", "Outro erro."] },
      "Falha genérica.",
    ),
    "CPF inválido.",
  );
  assert.equal(
    getIdentityApiErrorMessage(null, "Falha genérica."),
    "Falha genérica.",
  );
});

