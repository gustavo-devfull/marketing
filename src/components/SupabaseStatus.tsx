import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { isSupabaseConfigured } from '../config/supabase'
import { ProductService } from '../services/productService'

export default function SupabaseStatus() {
  const [state, setState] = useState<'checking' | 'ok' | 'error'>(isSupabaseConfigured ? 'checking' : 'error')
  const [msg, setMsg] = useState(isSupabaseConfigured ? '' : 'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    ProductService.ping()
      .then(() => setState('ok'))
      .catch((e: Error) => {
        setState('error')
        setMsg(e.message)
      })
  }, [])

  if (state === 'checking')
    return <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Loader2 size={14} className="animate-spin" /> Conectando…</span>
  if (state === 'ok')
    return <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={14} /> Supabase conectado</span>
  return <span className="inline-flex items-center gap-1 text-xs text-red-600" title={msg}><XCircle size={14} /> Supabase com erro</span>
}
