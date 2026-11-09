import { supabase } from '../config/supabase'
import { handle } from './errors'
import { DEFAULT_FABRICADO_EM, DEFAULT_VALIDADE, type LabelData, type LabelModel, type Product } from '../types'

const PAGE_SIZE = 1000
type Row = Record<string, unknown>
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const onlyDigits = (s: string) => s.replace(/\D/g, '')

function fromRow(r: Row): LabelData {
  return {
    referencia: text(r.referencia),
    ean: text(r.ean),
    dun: text(r.dun),
    modelo: (r.modelo === 'ravi' ? 'ravi' : 'mori') as LabelModel,
    nomeProduto: text(r.nome_produto),
    lote: text(r.lote),
    quantidade: text(r.quantidade),
    composicao: text(r.composicao),
    validade: text(r.validade),
    fabricadoEm: text(r.fabricado_em),
  }
}

/** Dados iniciais da etiqueta quando a referência ainda não tem nada salvo: vêm do cadastro do produto. */
export function labelDefaults(p: Product): LabelData {
  return {
    referencia: p.referencia,
    ean: onlyDigits(p.ean),
    dun: onlyDigits(p.dun),
    modelo: /ravi/i.test(p.marca) ? 'ravi' : 'mori',
    nomeProduto: `${p.referencia} ${p.nomeRaviProfit || p.name}`.trim(),
    lote: '',
    quantidade: '',
    composicao: '',
    validade: DEFAULT_VALIDADE,
    fabricadoEm: DEFAULT_FABRICADO_EM,
  }
}

export class LabelService {
  /** (referencia, ean, dun) de todas as etiquetas salvas — usado nos indicadores do painel. */
  static async listIndex(): Promise<{ referencia: string; ean: string; dun: string }[]> {
    const all: { referencia: string; ean: string; dun: string }[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('marketing_labels')
        .select('referencia, ean, dun')
        .order('referencia', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      handle(error)
      const rows = (data ?? []) as Row[]
      for (const r of rows) all.push({ referencia: text(r.referencia), ean: text(r.ean), dun: text(r.dun) })
      if (rows.length < PAGE_SIZE) break
    }
    return all
  }

  static async get(referencia: string): Promise<LabelData | null> {
    const { data, error } = await supabase.from('marketing_labels').select('*').eq('referencia', referencia).maybeSingle()
    handle(error)
    return data ? fromRow(data as Row) : null
  }

  static async save(d: LabelData): Promise<LabelData> {
    const { data, error } = await supabase
      .from('marketing_labels')
      .upsert(
        {
          referencia: d.referencia,
          ean: d.ean || null,
          dun: d.dun || null,
          modelo: d.modelo,
          nome_produto: d.nomeProduto || null,
          lote: d.lote || null,
          quantidade: d.quantidade || null,
          composicao: d.composicao || null,
          validade: d.validade || null,
          fabricado_em: d.fabricadoEm || null,
        },
        { onConflict: 'referencia' },
      )
      .select()
      .single()
    handle(error)
    return fromRow(data as Row)
  }
}
