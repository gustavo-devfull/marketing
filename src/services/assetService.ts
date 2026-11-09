import { supabase } from '../config/supabase'
import { handle, PermissionError } from './errors'
import type { Asset, AssetType } from '../types'

export const BUCKET = 'marketing'
const PAGE_SIZE = 1000

type Row = Record<string, unknown>
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function fromRow(r: Row): Asset {
  return {
    id: text(r.id),
    referencia: text(r.referencia),
    tipo: text(r.tipo) as AssetType,
    titulo: text(r.titulo),
    obs: text(r.obs),
    storagePath: text(r.storage_path),
    fileName: text(r.file_name),
    mimeType: text(r.mime_type),
    sizeBytes: Number(r.size_bytes ?? 0),
    createdAt: text(r.created_at),
  }
}

/** O Storage só aceita chaves ASCII "seguras": tira acentos e troca o resto por hífen. */
export function safeKeyPart(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'arquivo'
  )
}

export function assetUrl(a: Pick<Asset, 'storagePath'>): string {
  return supabase.storage.from(BUCKET).getPublicUrl(a.storagePath).data.publicUrl
}

/** Mesmo arquivo, mas com Content-Disposition: attachment (baixa em vez de abrir). */
export function assetDownloadUrl(a: Pick<Asset, 'storagePath' | 'fileName'>): string {
  return supabase.storage.from(BUCKET).getPublicUrl(a.storagePath, { download: a.fileName }).data.publicUrl
}

export class AssetService {
  /** (referencia, tipo) de todos os arquivos — usado para os contadores do painel. */
  static async listIndex(): Promise<{ referencia: string; tipo: AssetType }[]> {
    const all: { referencia: string; tipo: AssetType }[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('referencia, tipo')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      handle(error)
      const rows = (data ?? []) as Row[]
      for (const r of rows) all.push({ referencia: text(r.referencia), tipo: text(r.tipo) as AssetType })
      if (rows.length < PAGE_SIZE) break
    }
    return all
  }

  static async listByReferencia(referencia: string): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('marketing_assets')
      .select('*')
      .eq('referencia', referencia)
      .order('created_at', { ascending: false })
    handle(error)
    return ((data ?? []) as Row[]).map(fromRow)
  }

  static async upload(referencia: string, tipo: AssetType, file: File): Promise<Asset> {
    const path = `${safeKeyPart(referencia)}/${tipo}/${Date.now()}-${safeKeyPart(file.name)}`
    const up = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      cacheControl: '31536000',
      upsert: false,
    })
    handle(up.error)
    const { data, error } = await supabase
      .from('marketing_assets')
      .insert({
        referencia,
        tipo,
        titulo: file.name.replace(/\.[^.]+$/, ''),
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      })
      .select()
      .single()
    if (error) {
      // Não deixa arquivo órfão no Storage se o registro falhar.
      await supabase.storage.from(BUCKET).remove([path])
      handle(error)
    }
    return fromRow(data as Row)
  }

  static async update(id: string, patch: { titulo?: string; obs?: string; tipo?: AssetType }): Promise<Asset> {
    const { data, error } = await supabase.from('marketing_assets').update(patch).eq('id', id).select()
    handle(error)
    // Com RLS, update sem permissão não dá erro: apenas afeta 0 linhas.
    if (!data || data.length === 0) throw new PermissionError('Nenhuma linha atualizada (sem permissão de escrita?).')
    return fromRow(data[0] as Row)
  }

  static async remove(asset: Asset): Promise<void> {
    const { data, error } = await supabase.from('marketing_assets').delete().eq('id', asset.id).select('id')
    handle(error)
    if (!data || data.length === 0) throw new PermissionError('Nenhuma linha excluída (sem permissão de escrita?).')
    const rm = await supabase.storage.from(BUCKET).remove([asset.storagePath])
    handle(rm.error)
  }
}
