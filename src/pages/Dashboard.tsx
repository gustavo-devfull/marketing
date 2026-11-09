import { useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, LayoutGrid, List, Loader2, Search } from 'lucide-react'
import { normalizeText } from '../lib/normalize'
import { hasDun, hasEan } from '../lib/summary'
import type { AssetSummary, Product } from '../types'
import ProductCard from '../components/ProductCard'

const PAGE = 60
type Layout = 'grid' | 'list'
type Status = '' | 'semEan' | 'semDun' | 'semImagem' | 'semEmbalagem' | 'semSocial' | 'completo'

const STATUS: { key: Status; label: string }[] = [
  { key: '', label: 'Todas as situações' },
  { key: 'semEan', label: 'Sem EAN-13 válido' },
  { key: 'semDun', label: 'Sem DUN-14 válido' },
  { key: 'semImagem', label: 'Sem imagens' },
  { key: 'semEmbalagem', label: 'Sem arte de embalagem' },
  { key: 'semSocial', label: 'Sem artes para redes sociais' },
  { key: 'completo', label: 'Completos' },
]

function matchStatus(status: Status, s?: AssetSummary): boolean {
  const c = s?.counts
  switch (status) {
    case 'semEan': return !hasEan(s)
    case 'semDun': return !hasDun(s)
    case 'semImagem': return !c?.imagem
    case 'semEmbalagem': return !c?.embalagem
    case 'semSocial': return !c?.social
    case 'completo': return hasEan(s) && hasDun(s) && !!c?.imagem && !!c?.embalagem && !!c?.social
    default: return true
  }
}

function loadLayout(): Layout {
  try {
    return localStorage.getItem('marketingLayout') === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

const uniqueSorted = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

interface Props {
  products: Product[]
  summaries: Map<string, AssetSummary>
  loading: boolean
}

export default function Dashboard({ products, summaries, loading }: Props) {
  const [search, setSearch] = useState('')
  const [marca, setMarca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [status, setStatus] = useState<Status>('')
  const [showInactive, setShowInactive] = useState(false)
  const [visible, setVisible] = useState(PAGE)
  const [layout, setLayoutState] = useState<Layout>(loadLayout)

  useEffect(() => setVisible(PAGE), [search, marca, categoria, status, showInactive])

  const options = useMemo(() => ({
    marcas: uniqueSorted(products.map((p) => p.marca)),
    categorias: uniqueSorted(products.map((p) => p.categoria)),
  }), [products])

  // Índice de busca sem acento: referência, nomes, marca e códigos de barras.
  const index = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products) {
      const s = summaries.get(p.referencia)
      m.set(p.id, normalizeText(`${p.referencia} ${p.name} ${p.nomeRaviProfit} ${p.marca} ${p.categoria} ${s?.ean ?? ''} ${s?.dun ?? ''}`))
    }
    return m
  }, [products, summaries])

  const list = useMemo(() => {
    const terms = normalizeText(search).split(' ').filter(Boolean)
    return products.filter((p) => {
      if (!showInactive && !p.active) return false
      if (marca && p.marca !== marca) return false
      if (categoria && p.categoria !== categoria) return false
      if (!matchStatus(status, summaries.get(p.referencia))) return false
      const idx = index.get(p.id) ?? ''
      return terms.every((t) => idx.includes(t))
    })
  }, [products, summaries, index, search, marca, categoria, status, showInactive])

  const setLayout = (l: Layout) => {
    setLayoutState(l)
    try { localStorage.setItem('marketingLayout', l) } catch { /* sem armazenamento: só não lembra */ }
  }
  const filtered = search || marca || categoria || status || showInactive
  const clear = () => { setSearch(''); setMarca(''); setCategoria(''); setStatus(''); setShowInactive(false) }

  const sel = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400'

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por referência, nome, marca, EAN ou DUN…" aria-label="Buscar produtos" className={`${sel} w-full pl-9`} />
        </div>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value as Status)} aria-label="Situação dos ativos">
          {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className={sel} value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Marca"><option value="">Todas as marcas</option>{options.marcas.map((o) => <option key={o}>{o}</option>)}</select>
        <select className={sel} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria"><option value="">Todas as categorias</option>{options.categorias.map((o) => <option key={o}>{o}</option>)}</select>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-orange-500" /> Mostrar inativos
        </label>
        {filtered && <button onClick={clear} className="text-sm text-orange-600 hover:underline">Limpar filtros</button>}
        <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white" role="group" aria-label="Modo de visualização">
          <button onClick={() => setLayout('grid')} aria-pressed={layout === 'grid'} title="Ver em colunas" className={`px-2.5 py-2 ${layout === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setLayout('list')} aria-pressed={layout === 'list'} title="Ver em linhas" className={`px-2.5 py-2 ${layout === 'list' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><List size={16} /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-500"><Loader2 className="animate-spin" /> Carregando produtos…</div>
      ) : products.length === 0 ? (
        <div className="mx-auto max-w-md rounded-xl bg-white p-10 text-center shadow-sm">
          <FileSpreadsheet className="mx-auto mb-3 text-gray-300" size={48} />
          <h2 className="font-semibold text-gray-800">Nenhum produto encontrado</h2>
          <p className="text-sm text-gray-500">Os ativos são organizados pela referência dos produtos cadastrados na Base de Produtos. Cadastre os produtos lá e eles aparecem aqui.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-500">{list.length} de {products.length} produtos</p>
          <div className={layout === 'grid' ? 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-3'}>
            {list.slice(0, visible).map((p) => (
              <ProductCard key={p.id} product={p} summary={summaries.get(p.referencia)} layout={layout} />
            ))}
          </div>
          {list.length === 0 && <p className="py-12 text-center text-gray-500">Nenhum produto encontrado para os filtros atuais.</p>}
          {visible < list.length && (
            <div className="py-4 text-center"><button onClick={() => setVisible((v) => v + PAGE)} className="rounded-lg border bg-white px-5 py-2 text-sm hover:bg-gray-50">Mostrar mais ({list.length - visible})</button></div>
          )}
        </>
      )}
    </main>
  )
}
