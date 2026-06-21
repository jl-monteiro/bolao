import assert from "node:assert/strict";
import test from "node:test";

const contractUrl = new URL(
  "./ownership-transfer-contract.ts",
  import.meta.url,
).href;
const {
  buildGroupOwnershipTransferPath,
  buildGroupOwnershipTransfersPath,
  buildMyOwnershipTransfersPath,
  buildOwnershipTransferAcceptPath,
  createOwnershipTransferAcceptBody,
  createOwnershipTransferBody,
  getOwnershipTransferStatusLabel,
} =
  (await import(contractUrl)) as typeof import("./ownership-transfer-contract");

test("builds ownership transfer endpoints", () => {
  assert.equal(
    buildGroupOwnershipTransfersPath("group/1"),
    "/v1/groups/group%2F1/ownership-transfers",
  );
  assert.equal(
    buildGroupOwnershipTransferPath("group/1", "transfer 2"),
    "/v1/groups/group%2F1/ownership-transfers/transfer%202",
  );
  assert.equal(
    buildMyOwnershipTransfersPath(),
    "/v1/me/ownership-transfers",
  );
  assert.equal(
    buildOwnershipTransferAcceptPath("transfer 2"),
    "/v1/me/ownership-transfers/transfer%202/accept",
  );
});

test("builds ownership transfer bodies", () => {
  assert.deepEqual(createOwnershipTransferBody("membership-1"), {
    targetMembershipId: "membership-1",
  });
  assert.deepEqual(createOwnershipTransferAcceptBody(" 123456 "), {
    totpCode: "123456",
  });
});

test("labels ownership transfer statuses", () => {
  assert.equal(getOwnershipTransferStatusLabel("PENDING"), "Pendente");
  assert.equal(getOwnershipTransferStatusLabel("ACCEPTED"), "Aceita");
  assert.equal(getOwnershipTransferStatusLabel("REVOKED"), "Revogada");
  assert.equal(getOwnershipTransferStatusLabel("EXPIRED"), "Expirada");
});
