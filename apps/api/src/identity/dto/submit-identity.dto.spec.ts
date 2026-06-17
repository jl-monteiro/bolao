import assert from "node:assert/strict";
import { describe, it } from "@jest/globals";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { isValidCpf } from "../cpf.js";
import { SubmitIdentityDto } from "./submit-identity.dto.js";

const VALID_CPF = "11144477735";
const PACING_CPF_PUNCTUATED = "111.444.777-35";

describe("SubmitIdentityDto", () => {
  it("strips CPF punctuation, accepts a properly-named human of legal age", async () => {
    const input = plainToInstance(SubmitIdentityDto, {
      birthDate: "1990-05-15",
      cpf: PACING_CPF_PUNCTUATED,
      fullName: "  Maria da Silva ",
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    assert.equal(input.cpf, VALID_CPF);
    assert.equal(input.fullName, "Maria da Silva");
  });

  it("rejects a CPF failing the mod-11 checksum once stripped", async () => {
    const input = plainToInstance(SubmitIdentityDto, {
      birthDate: "1990-05-15",
      cpf: "111.444.777-99",
      fullName: "Maria da Silva",
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    assert.equal(isValidCpf(input.cpf), false);
  });

  it("rejects a short trimmed name", async () => {
    const input = plainToInstance(SubmitIdentityDto, {
      birthDate: "1990-05-15",
      cpf: PACING_CPF_PUNCTUATED,
      fullName: "A",
    });

    const errors = await validate(input);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects an obviously malformed birth date", async () => {
    const input = plainToInstance(SubmitIdentityDto, {
      birthDate: "not-a-date",
      cpf: PACING_CPF_PUNCTUATED,
      fullName: "Maria da Silva",
    });

    const errors = await validate(input);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a CPF shorter than 11 digits after stripping", async () => {
    const input = plainToInstance(SubmitIdentityDto, {
      birthDate: "1990-05-15",
      cpf: "12345",
      fullName: "Maria da Silva",
    });

    const errors = await validate(input);
    expect(errors.length).toBeGreaterThan(0);
  });
});
