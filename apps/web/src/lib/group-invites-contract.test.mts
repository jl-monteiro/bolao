import assert from "node:assert/strict";
import test from "node:test";

const contractUrl = new URL(
  "./group-invites-contract.ts",
  import.meta.url,
).href;
const {
  buildInviteLoginHref,
  getApiErrorMessage,
  getInviteStatusLabel,
  getPendingMemberStatusLabel,
  getSafeAuthenticatedReturnPath,
  getSafeInviteReturnPath,
  parseInviteAcceptance,
  parseInvitePreview,
  parseInviteToken,
} = (await import(contractUrl)) as typeof import("./group-invites-contract");

test("accepts only the internal invitation return path", () => {
  assert.equal(
    getSafeInviteReturnPath("/convites/aceitar"),
    "/convites/aceitar",
  );
  assert.equal(
    getSafeInviteReturnPath("/convites/aceitar#token=local"),
    "/convites/aceitar",
  );
  assert.equal(getSafeInviteReturnPath("https://example.com"), "/app");
  assert.equal(getSafeInviteReturnPath("//example.com"), "/app");
  assert.equal(getSafeInviteReturnPath("/app"), "/app");
});

test("accepts only safe authenticated return paths", () => {
  assert.equal(
    getSafeAuthenticatedReturnPath("/convites/aceitar"),
    "/convites/aceitar",
  );
  assert.equal(
    getSafeAuthenticatedReturnPath("/ativar-membro/pending_123-ABC"),
    "/ativar-membro/pending_123-ABC",
  );
  assert.equal(
    getSafeAuthenticatedReturnPath("/ativar-membro/pending-1?next=/app"),
    "/app",
  );
  assert.equal(
    getSafeAuthenticatedReturnPath("https://example.com/ativar-membro/x"),
    "/app",
  );
  assert.equal(getSafeAuthenticatedReturnPath("/app"), "/app");
});

test("builds a login URL without exposing the invitation token", () => {
  const href = buildInviteLoginHref();

  assert.equal(href, "/entrar?retorno=%2Fconvites%2Faceitar");
  assert.equal(href.includes("token"), false);
});

test("reads a URL-safe token only from the fragment", () => {
  assert.equal(parseInviteToken("#token=abc_DEF-123"), "abc_DEF-123");
  assert.equal(parseInviteToken("#outra=1&token=abc-123"), "abc-123");
  assert.equal(parseInviteToken("#token="), null);
  assert.equal(parseInviteToken("?token=abc-123"), null);
  assert.equal(parseInviteToken("#token=abc%20def"), null);
});

test("normalizes API error payloads without leaking arrays to the UI", () => {
  assert.equal(
    getApiErrorMessage(
      { message: ["E-mail invÃ¡lido.", "Outro erro."] },
      "Falha genÃ©rica.",
    ),
    "E-mail invÃ¡lido.",
  );
  assert.equal(
    getApiErrorMessage({ message: "Convite duplicado." }, "Falha genÃ©rica."),
    "Convite duplicado.",
  );
  assert.equal(getApiErrorMessage(null, "Falha genÃ©rica."), "Falha genÃ©rica.");
});

test("provides textual labels for every invitation state", () => {
  assert.equal(getInviteStatusLabel("PENDING"), "Pendente");
  assert.equal(getInviteStatusLabel("ACCEPTED"), "Aceito");
  assert.equal(getInviteStatusLabel("REVOKED"), "Revogado");
  assert.equal(getInviteStatusLabel("EXPIRED"), "Expirado");
});

test("provides textual labels for every pending membership state", () => {
  assert.equal(getPendingMemberStatusLabel("PENDING"), "Validação pendente");
  assert.equal(getPendingMemberStatusLabel("ACTIVATED"), "Ativado");
  assert.equal(getPendingMemberStatusLabel("EXPIRED"), "Expirado");
});

test("parses preview responses without requiring a single transport shape", () => {
  assert.deepEqual(
    parseInvitePreview({
      expiresAt: "2026-06-21T12:00:00.000Z",
      group: { name: "Copa do Bairro" },
      issuedBy: { name: "Ana" },
    }),
    {
      expiresAt: "2026-06-21T12:00:00.000Z",
      groupName: "Copa do Bairro",
      issuedByName: "Ana",
    },
  );
  assert.equal(parseInvitePreview({ expiresAt: "invalid" }), null);
});

test("parses idempotent acceptance responses into the pending state", () => {
  assert.deepEqual(
    parseInviteAcceptance({
      pendingMembership: {
        acceptedAt: "2026-06-14T12:00:00.000Z",
        expiresAt: "2026-07-14T12:00:00.000Z",
        id: "pending-1",
        status: "PENDING",
      },
    }),
    {
      acceptedAt: "2026-06-14T12:00:00.000Z",
      expiresAt: "2026-07-14T12:00:00.000Z",
      id: "pending-1",
      status: "PENDING",
    },
  );
  assert.equal(parseInviteAcceptance({ status: "ACCEPTED" }), null);
});
