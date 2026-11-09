import { Barcode, FolderOpen, ImageIcon, Package, Share2, type LucideIcon } from 'lucide-react'
import ProductImage from './ProductImage'
import { hasDun, hasEan } from '../lib/summary'
import type { AssetSummary, AssetType, Product } from '../types'

interface Props {
  product: Product
  summary?: AssetSummary
  /** grid: card vertical. list: um produto por linha. */
  layout?: 'grid' | 'list'
}

const ICONS: Record<AssetType, { icon: LucideIcon; label: string }> = {
  imagem: { icon: ImageIcon, label: 'Imagens' },
  embalagem: { icon: Package, label: 'Arte de embalagem' },
  social: { icon: Share2, label: 'Artes para redes sociais' },
  outro: { icon: FolderOpen, label: 'Outros arquivos' },
}

function Chip({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
      {children}
    </span>
  )
}

export default function ProductCard({ product: p, summary, layout = 'grid' }: Props) {
  const title = p.nomeRaviProfit || p.name || '(sem nome)'
  const list = layout === 'list'
  const ean = hasEan(summary)
  const dun = hasDun(summary)
  return (
    <a
      href={`#/ref/${encodeURIComponent(p.referencia)}`}
      className={`flex rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:shadow-md ${list ? 'items-center gap-4' : 'flex-col'} ${p.active ? '' : 'opacity-40'}`}
    >
      <div className={list ? 'w-[112px] shrink-0' : undefined}>
        <ProductImage referencia={p.referencia} />
      </div>
      <div className={`min-w-0 flex-1 text-sm ${list ? '' : 'mt-2'}`}>
        <p className="font-semibold text-orange-600">{p.referencia}</p>
        <h3 className={`line-clamp-2 font-medium leading-5 text-gray-800 ${list ? '' : 'min-h-[2.5rem]'}`} title={title}>{title}</h3>
        {p.marca && <p className="truncate text-xs text-gray-400">{p.marca}</p>}
      </div>
      <div className={`flex flex-wrap items-center gap-1 ${list ? 'justify-end' : 'mt-2 border-t border-gray-100 pt-2'}`}>
        <Chip ok={ean} title={ean ? `EAN-13: ${summary!.ean}` : 'Sem EAN-13 válido'}><Barcode size={12} /> EAN</Chip>
        <Chip ok={dun} title={dun ? `DUN-14: ${summary!.dun}` : 'Sem DUN-14 válido'}><Barcode size={12} /> DUN</Chip>
        {(Object.keys(ICONS) as AssetType[]).map((t) => {
          const n = summary?.counts[t] ?? 0
          const Icon = ICONS[t].icon
          return <Chip key={t} ok={n > 0} title={`${ICONS[t].label}: ${n}`}><Icon size={12} /> {n}</Chip>
        })}
      </div>
    </a>
  )
}
