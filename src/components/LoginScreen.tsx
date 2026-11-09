import { useState, type FormEvent } from 'react'
import { LogIn, X } from 'lucide-react'
import { supabase } from '../config/supabase'

export default function LoginScreen({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : error.message)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" aria-label="Fechar"><X size={18} /></button>
        <h2 className="mb-1 text-xl font-semibold text-gray-800">Entrar</h2>
        <p className="mb-4 text-sm text-gray-500">Login necessário para enviar, editar e excluir ativos.</p>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-gray-600">E-mail</span>
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-gray-600">Senha</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
        </label>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-60">
          <LogIn size={16} /> {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
