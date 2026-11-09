import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, LogIn, Megaphone } from 'lucide-react'
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
  const { session, loading: sessionLoading } = useSession()
  const userId = session?.user.id ?? null
  /** Perfil em public.profiles: undefined = carregando, null = sem perfil ativo. */
  const [role, setRole] = useState<string | null | undefined>(undefined)
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

  // Todo o banco exige login com perfil ativo: os dados são (re)carregados a cada troca de usuário.
  useEffect(() => {
    setProducts([])
    setAssetIndex([])
    setLabelIndex([])
    setSetupError('')
    setRole(undefined)
    if (!userId) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const { data } = await supabase.from('profiles').select('role, ativo').eq('id', userId).maybeSingle()
      if (cancelled) return
      const r = data && data.ativo !== false && data.role ? String(data.role) : null
      setRole(r)
      if (!r) return
      try {
        const list = await ProductService.getAll(true)
        if (!cancelled) setProducts(list)
      } catch (e) {
        if (!cancelled) onError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    void loadIndexes()
    return () => { cancelled = true }
  }, [userId, onError, loadIndexes])

  const canWrite = role === 'admin' || role === 'marketing'
  const summaries = useMemo(() => buildSummaries(products, assetIndex, labelIndex), [products, assetIndex, labelIndex])
  const current = useMemo(() => (currentRef ? products.find((p) => p.referencia === currentRef) : undefined), [products, currentRef])

  return (
    <div className="min-h-screen">
      <MainHeader session={session} role={role ?? ''} onLogin={() => setShowLogin(true)} onLogout={() => supabase.auth.signOut()} />
      {sessionLoading || (session && role === undefined) ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-500"><Loader2 className="animate-spin" /> Carregando…</div>
      ) : !session ? (
        <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-10 text-center shadow-sm">
          <Megaphone className="mx-auto mb-3 text-orange-500" size={40} />
          <h2 className="text-lg font-semibold text-gray-800">Gestão de ativos de marketing</h2>
          <p className="mb-5 mt-1 text-sm text-gray-500">Etiquetas de código de barras, imagens, artes de embalagem e de redes sociais, organizadas pela referência do produto. Entre com o mesmo login da Base de Produtos.</p>
          <button onClick={() => setShowLogin(true)} className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"><LogIn size={16} /> Entrar</button>
        </div>
      ) : role === null ? (
        <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Usuário sem perfil ativo</h2>
          <p className="mt-1 text-sm text-gray-500"><strong>{session.user.email}</strong> não tem um perfil ativo neste sistema. Peça a um administrador para liberar seu acesso na Base de Produtos.</p>
        </div>
      ) : (
        <>
          {setupError && (
            <div className="mx-auto mt-4 max-w-[1280px] px-4">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                Não foi possível ler os ativos de marketing. Confira se as migrations de <code className="rounded bg-amber-100 px-1">supabase/migrations</code> foram aplicadas no Supabase.
                <span className="block text-xs text-amber-700">{setupError}</span>
              </p>
            </div>
          )}
          {currentRef === null ? (
            <Dashboard products={products} summaries={summaries} loading={loading} />
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-gray-500"><Loader2 className="animate-spin" /> Carregando…</div>
          ) : current ? (
            <ProductAssets key={current.referencia} product={current} canWrite={canWrite} onChanged={loadIndexes} onError={onError} onNotify={onNotify} />
          ) : (
            <div className="mx-auto max-w-md py-24 text-center text-gray-500">
              <p className="mb-3">Referência <strong>{currentRef}</strong> não encontrada na Base de Produtos.</p>
              <a href="#/" className="text-orange-600 hover:underline">Voltar ao painel</a>
            </div>
          )}
        </>
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
