import { ExternalLink, LogIn, LogOut, Megaphone } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import SupabaseStatus from './SupabaseStatus'

const PRODUCTS_SYSTEM_URL = (import.meta.env.VITE_PRODUCTS_SYSTEM_URL as string | undefined) || ''

interface Props {
  session: Session | null
  role: string
  onLogin: () => void
  onLogout: () => void
}

export default function MainHeader({ session, role, onLogin, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-2">
        <a href="#/" className="flex items-center gap-2">
          <Megaphone className="text-orange-500" />
          <h1 className="text-lg font-bold text-gray-800">Marketing Ravi <span className="font-normal text-gray-500">– Gestão de Ativos</span></h1>
        </a>
        <div className="flex items-center gap-3">
          {session && role && <SupabaseStatus key={session.user.id} />}
          {session && <span className="hidden text-xs text-gray-500 sm:inline">{session.user.email}{role && ` · ${role}`}</span>}
          {PRODUCTS_SYSTEM_URL && (
            <a href={PRODUCTS_SYSTEM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              <ExternalLink size={14} /> Base de Produtos
            </a>
          )}
          {session ? (
            <button onClick={onLogout} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" title={session.user.email ?? ''}>
              <LogOut size={14} /> Sair
            </button>
          ) : (
            <button onClick={onLogin} className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600">
              <LogIn size={14} /> Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
