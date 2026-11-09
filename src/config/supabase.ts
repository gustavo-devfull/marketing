import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

const notConfigured = () =>
  Promise.reject(
    new Error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env.local ou Vercel) e reinicie o servidor.'),
  )

// Sem variáveis, nenhuma requisição de rede é feita: toda chamada falha com a mensagem acima
// (exibida na interface), em vez de tentar conectar em um host inexistente.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  global: isSupabaseConfigured ? {} : { fetch: notConfigured },
})
