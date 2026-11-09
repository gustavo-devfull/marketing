import { supabase } from '../config/supabase'
import { handle } from './errors'
import type { Product } from '../types'

const PAGE_SIZE = 1000 // limite padrão de linhas por requisição do Supabase
const COLUMNS = 'id, referencia, name, nome_ravi_profit, marca, categoria, ean, dun, unit_ctn, active'

type Row = Record<string, unknown>
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function fromRow(r: Row): Product {
  return {
    id: text(r.id),
    referencia: text(r.referencia),
    name: text(r.name),
    nomeRaviProfit: text(r.nome_ravi_profit),
    marca: text(r.marca),
    categoria: text(r.categoria),
    ean: text(r.ean),
    dun: text(r.dun),
    unitCtn: r.unit_ctn === null || r.unit_ctn === undefined || r.unit_ctn === '' ? null : Number(r.unit_ctn),
    active: r.active !== false,
  }
}

/** Somente leitura: os produtos são mantidos no sistema Base de Produtos. */
export class ProductService {
  private static cache: Product[] | null = null
  private static inflight: Promise<Product[]> | null = null

  static async ping(): Promise<void> {
    const { error } = await supabase.from('products').select('id', { count: 'exact', head: true })
    handle(error)
  }

  static async getAll(force = false): Promise<Product[]> {
    if (!force && this.cache) return this.cache
    if (!force && this.inflight) return this.inflight
    this.inflight = (async () => {
      const all: Product[] = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('products')
          .select(COLUMNS)
          .order('referencia', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
        handle(error)
        const rows = (data ?? []) as Row[]
        for (const r of rows) all.push(fromRow(r))
        if (rows.length < PAGE_SIZE) break
      }
      this.cache = all
      return all
    })()
    try {
      return await this.inflight
    } finally {
      this.inflight = null
    }
  }
}
