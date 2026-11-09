export interface Product {
  id: string
  referencia: string
  name: string
  nomeRaviProfit: string
  marca: string
  categoria: string
  ean: string
  dun: string
  unitCtn: number | null
  active: boolean
}

export type AssetType = 'imagem' | 'embalagem' | 'social' | 'outro'

export const ASSET_TYPES: { key: AssetType; label: string; short: string; hint: string }[] = [
  { key: 'imagem', label: 'Imagens', short: 'Imagens', hint: 'Fotos do produto, ambientadas, recortes, renders.' },
  { key: 'embalagem', label: 'Arte de embalagens', short: 'Embalagem', hint: 'Arquivos finais e de trabalho da embalagem (PDF, AI, PSD, CDR…).' },
  { key: 'social', label: 'Artes para redes sociais', short: 'Redes sociais', hint: 'Posts, stories, reels, banners e anúncios.' },
  { key: 'outro', label: 'Outros', short: 'Outros', hint: 'Manuais, fichas técnicas, vídeos e demais arquivos.' },
]

export interface Asset {
  id: string
  referencia: string
  tipo: AssetType
  titulo: string
  obs: string
  storagePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type LabelModel = 'mori' | 'ravi'

export interface LabelData {
  referencia: string
  ean: string
  dun: string
  modelo: LabelModel
  nomeProduto: string
  lote: string
  quantidade: string
  composicao: string
  validade: string
  fabricadoEm: string
}

export const DEFAULT_VALIDADE = 'Validade indeterminada. Produto não perecível.'
export const DEFAULT_FABRICADO_EM = 'China'

/** Resumo por referência usado nos cards do painel. */
export interface AssetSummary {
  counts: Record<AssetType, number>
  ean: string
  dun: string
}
