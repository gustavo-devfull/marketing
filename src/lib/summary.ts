import { isValidDUN14, isValidEAN13 } from './barcodeValidation'
import type { AssetSummary, AssetType, Product } from '../types'

export const emptyCounts = (): Record<AssetType, number> => ({ imagem: 0, embalagem: 0, social: 0, outro: 0 })

/** Junta cadastro do produto + etiquetas salvas + arquivos em um resumo por referência. */
export function buildSummaries(
  products: Product[],
  assets: { referencia: string; tipo: AssetType }[],
  labels: { referencia: string; ean: string; dun: string }[],
): Map<string, AssetSummary> {
  const digits = (s: string) => s.replace(/\D/g, '')
  const map = new Map<string, AssetSummary>()
  for (const p of products) map.set(p.referencia, { counts: emptyCounts(), ean: digits(p.ean), dun: digits(p.dun) })
  for (const l of labels) {
    const s = map.get(l.referencia)
    if (!s) continue
    // O código salvo na etiqueta prevalece sobre o do cadastro.
    if (l.ean) s.ean = l.ean
    if (l.dun) s.dun = l.dun
  }
  for (const a of assets) {
    const s = map.get(a.referencia)
    if (s && a.tipo in s.counts) s.counts[a.tipo]++
  }
  return map
}

export const hasEan = (s?: AssetSummary) => !!s && isValidEAN13(s.ean)
export const hasDun = (s?: AssetSummary) => !!s && isValidDUN14(s.dun)

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}
