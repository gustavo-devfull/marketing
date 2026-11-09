export function calculateEANCheckDigit(first12: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (sum % 10)) % 10
}

/** DUN-14 (ITF-14): pesos 3,1,3,1… a partir do primeiro dos 13 dígitos. */
export function calculateDUNCheckDigit(first13: string): number {
  let sum = 0
  for (let i = 0; i < 13; i++) sum += Number(first13[i]) * (i % 2 === 0 ? 3 : 1)
  return (10 - (sum % 10)) % 10
}

export function isValidEAN13(code: string): boolean {
  return /^\d{13}$/.test(code) && calculateEANCheckDigit(code.slice(0, 12)) === Number(code[12])
}

export function isValidDUN14(code: string): boolean {
  return /^\d{14}$/.test(code) && calculateDUNCheckDigit(code.slice(0, 13)) === Number(code[13])
}

/** DUN-14 da caixa a partir do EAN-13 da unidade: indicador logístico + 12 primeiros dígitos + novo dígito verificador. */
export function dunFromEan(ean: string, indicator = 1): string {
  if (!isValidEAN13(ean)) return ''
  const base = `${indicator}${ean.slice(0, 12)}`
  return base + calculateDUNCheckDigit(base)
}

/** Formato de leitura GS1 Brasil: 1 + 2 + 5 + 5 + 1. */
export function formatDUN14Display(code: string): string {
  return `${code[0]}  ${code.slice(1, 3)}  ${code.slice(3, 8)}  ${code.slice(8, 13)}  ${code[13]}`
}
