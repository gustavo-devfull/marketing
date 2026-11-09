import { ShieldAlert } from 'lucide-react'

interface Props {
  detail?: string
  onClose: () => void
  onLogin: () => void
}

export default function PermissionError({ detail, onClose, onLogin }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-red-600">
          <ShieldAlert />
          <h2 className="text-lg font-semibold">Sem permissão para esta ação</h2>
        </div>
        <p className="mb-3 text-sm text-gray-700">
          O Supabase bloqueou a operação. A consulta é pública, mas
          <strong> enviar, editar e excluir ativos exigem login</strong>.
        </p>
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
          <li>Entre com seu e-mail e senha (botão abaixo).</li>
          <li>Se ainda não tem usuário: Supabase → Authentication → Users → Add user.</li>
          <li>Se as tabelas ou o bucket não existem, rode <code className="rounded bg-gray-100 px-1">supabase/migrations/0001_marketing_assets.sql</code> no SQL Editor.</li>
        </ol>
        {detail && <p className="mb-3 break-words rounded bg-gray-50 p-2 text-xs text-gray-500">{detail}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Fechar</button>
          <button onClick={onLogin} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">Entrar</button>
        </div>
      </div>
    </div>
  )
}
