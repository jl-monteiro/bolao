import assert from "node:assert/strict";
import { describe, it } from "@jest/globals";
import { isValidCpf, normaliseCpf } from "./cpf.js";

describe("cpf", () => {
  describe("normaliseCpf", () => {
    it("strips punctuation and spaces", () => {
      assert.equal(normaliseCpf("111.444.777-05"), "11144477705");
      assert.equal(normaliseCpf(" 111 444 777 05 "), "11144477705");
    });
  });

  describe("isValidCpf", () => {
    it.each([
      ["11144477735", true],
      ["111.444.777-35", true],
      ["11144477799", false],
      ["111.444.777-99", false],
    ])("returns %s for %s", (input, expected) => {
      assert.equal(isValidCpf(input), expected);
    });

    it("rejects repeated-digit sequences", () => {
      assert.equal(isValidCpf("00000000000"), false);
      assert.equal(isValidCpf("11111111111"), false);
    });

    it("rejects short inputs", () => {
      assert.equal(isValidCpf(""), false);
      assert.equal(isValidCpf("123"), false);
    });

    it("rejects inputs with non-digit characters that leave the wrong length", () => {
      assert.equal(isValidCpf("111.444.777-051"), false);
      assert.equal(isValidCpf("1114447770"), false);
    });
  });
});
