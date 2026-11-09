import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './config/supabase'
import { useSession } from './hooks'
import { PermissionError as PermissionErrorClass } from './services/errors'
import { ProductService } from './services/productService'
import { AssetService } from './services/assetService'
import { LabelService } from './services/labelService'
import { buildSummaries } from './lib/summary'
import type { AssetType, Product } from './types'
import MainHeader from './components/MainHeader'
import LoginScreen from './components/LoginScreen'
import PermissionError from './components/PermissionError'
import Dashboard from './pages/Dashboard'
import ProductAssets from './pages/ProductAssets'

/** Rota simples por hash: `#/ref/RM1554` abre os ativos da referência; o resto é o painel. */
function useHashRef(): string | null {
  const read = () => {
    const m = window.location.hash.match(/^#\/ref\/(.+)$/)
    if (!m) return null
    try {
      return decodeURIComponent(m[1])
    } catch {
      return m[1]
    }
  }
  const [ref, setRef] = useState<string | null>(read)
  useEffect(() => {
    const on = () => setRef(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return ref
}

export default function App() {
  const { session } = useSession()
  const currentRef = useHashRef()
  const [showLogin, setShowLogin] = useState(false)
  const [permission, setPermission] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [assetIndex, setAssetIndex] = useState<{ referencia: string; tipo: AssetType }[]>([])
  const [labelIndex, setLabelIndex] = useState<{ referencia: string; ean: string; dun: string }[]>([])
  /** Erro ao ler as tabelas de marketing (normalmente: migration ainda não rodada). */
  const [setupError, setSetupError] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const onError = useCallback((e: unknown) => {
    if (e instanceof PermissionErrorClass) setPermission(e.message)
    else setToast({ msg: e instanceof Error ? e.message : 'Erro inesperado', error: true })
  }, [])
  const onNotify = useCallback((msg: string) => setToast({ msg }), [])

  const loadIndexes = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([AssetService.listIndex(), LabelService.listIndex()])
      setAssetIndex(a)
      setLabelIndex(l)
      setSetupError('')
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    ProductService.getAll()
      .then(setProducts)
      .catch(onError)
      .finally(() => setLoading(false))
    void loadIndexes()
  }, [onError, loadIndexes])

  const summaries = useMemo(() => buildSummaries(products, assetIndex, labelIndex), [products, assetIndex, labelIndex])
  const current = useMemo(() => (currentRef ? products.find((p) => p.referencia === currentRef) : undefined), [products, currentRef])

  return (
    <div className="min-h-screen">
      <MainHeader session={session} onLogin={() => setShowLogin(true)} onLogout={() => supabase.auth.signOut()} />
      {setupError && (
        <div className="mx-auto mt-4 max-w-[1280px] px-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Não foi possível ler os ativos de marketing. Rode <code className="rounded bg-amber-100 px-1">supabase/migrations/0001_marketing_assets.sql</code> no SQL Editor do Supabase.
            <span className="block text-xs text-amber-700">{setupError}</span>
          </p>
        </div>
      )}
      {currentRef === null ? (
        <Dashboard products={products} summaries={summaries} loading={loading} />
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-500"><Loader2 className="animate-spin" /> Carregando…</div>
      ) : current ? (
        <ProductAssets key={current.referencia} product={current} canWrite={!!session} onChanged={loadIndexes} onError={onError} onNotify={onNotify} />
      ) : (
        <div className="mx-auto max-w-md py-24 text-center text-gray-500">
          <p className="mb-3">Referência <strong>{currentRef}</strong> não encontrada na Base de Produtos.</p>
          <a href="#/" className="text-orange-600 hover:underline">Voltar ao painel</a>
        </div>
      )}
      {showLogin && <LoginScreen onClose={() => setShowLogin(false)} />}
      {permission !== null && (
        <PermissionError detail={permission} onClose={() => setPermission(null)} onLogin={() => { setPermission(null); setShowLogin(true) }} />
      )}
      {toast && (
        <div role="status" className={`fixed bottom-4 right-4 z-[80] rounded-lg px-4 py-2 text-sm text-white shadow-lg ${toast.error ? 'bg-red-600' : 'bg-gray-800'}`}>{toast.msg}</div>
      )}
    </div>
  )
}
