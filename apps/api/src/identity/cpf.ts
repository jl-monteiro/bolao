export function normaliseCpf(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function isValidCpf(input: string): boolean {
  const digits = normaliseCpf(input);

  if (digits.length !== 11) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  const firstCheck = computeCheckDigit(digits.slice(0, 9));
  const secondCheck = computeCheckDigit(digits.slice(0, 10));

  if (firstCheck !== Number(digits[9])) {
    return false;
  }

  if (secondCheck !== Number(digits[10])) {
    return false;
  }

  return true;
}

function computeCheckDigit(base: string): number {
  let sum = 0;

  for (let index = 0; index < base.length; index += 1) {
    sum += Number(base[index]) * (base.length + 1 - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
