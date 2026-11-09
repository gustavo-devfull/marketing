import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Barcode } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import BarcodeTab from '../components/BarcodeTab'
import FilesTab from '../components/FilesTab'
import { AssetService } from '../services/assetService'
import { ASSET_TYPES, type Asset, type AssetType, type Product } from '../types'

type Tab = 'barcode' | AssetType

interface Props {
  product: Product
  canWrite: boolean
  /** Algo mudou (arquivo enviado/excluído, etiqueta salva): o painel precisa recontar. */
  onChanged: () => void
  onError: (e: unknown) => void
  onNotify: (msg: string) => void
}

export default function ProductAssets({ product, canWrite, onChanged, onError, onNotify }: Props) {
  const [tab, setTab] = useState<Tab>('barcode')
  const [assets, setAssets] = useState<Asset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(true)

  useEffect(() => {
    let cancelled = false
    AssetService.listByReferencia(product.referencia)
      .then((a) => { if (!cancelled) setAssets(a) })
      // Tabela ausente já é avisada no topo da página; aqui a aba só fica vazia.
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoadingAssets(false) })
    return () => { cancelled = true }
  }, [product.referencia])

  const change = useCallback((fn: (list: Asset[]) => Asset[]) => {
    setAssets(fn)
    onChanged()
  }, [onChanged])

  const title = product.nomeRaviProfit || product.name || '(sem nome)'
  const count = (t: AssetType) => assets.filter((a) => a.tipo === t).length
  const tabCls = (active: boolean) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <a href="#/" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600"><ArrowLeft size={16} /> Todos os produtos</a>

      <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <ProductImage referencia={product.referencia} width={140} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-orange-600">{product.referencia}</p>
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">{[product.marca, product.categoria].filter(Boolean).join(' · ')}</p>
          {!product.active && <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs">Inativo</span>}
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist">
        <button role="tab" aria-selected={tab === 'barcode'} onClick={() => setTab('barcode')} className={tabCls(tab === 'barcode')}><Barcode size={16} /> Códigos de barras</button>
        {ASSET_TYPES.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={tabCls(tab === t.key)}>
            {t.label}
            <span className={`rounded-full px-1.5 text-xs ${count(t.key) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>{count(t.key)}</span>
          </button>
        ))}
      </div>

      {/* A aba de códigos fica montada para não perder o que foi digitado ao trocar de aba. */}
      <div hidden={tab !== 'barcode'}>
        <BarcodeTab product={product} canWrite={canWrite} onSaved={onChanged} onError={onError} onNotify={onNotify} />
      </div>
      {tab !== 'barcode' && (
        <FilesTab
          key={tab}
          referencia={product.referencia}
          tipo={tab}
          assets={assets.filter((a) => a.tipo === tab)}
          loading={loadingAssets}
          canWrite={canWrite}
          onUploaded={(a) => change((l) => [a, ...l])}
          onUpdated={(a) => change((l) => l.map((x) => (x.id === a.id ? a : x)))}
          onRemoved={(a) => change((l) => l.filter((x) => x.id !== a.id))}
          onError={onError}
          onNotify={onNotify}
        />
      )}
    </main>
  )
}
