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
          O Supabase bloqueou a operação. Qualquer perfil ativo pode consultar, mas
          <strong> enviar, editar e excluir ativos exige o perfil admin ou marketing</strong>.
        </p>
        <p className="mb-3 text-sm text-gray-700">Se a sua sessão expirou, entre de novo. Se o seu perfil é outro, peça a um administrador para ajustá-lo.</p>
        {detail && <p className="mb-3 break-words rounded bg-gray-50 p-2 text-xs text-gray-500">{detail}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Fechar</button>
          <button onClick={onLogin} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">Entrar</button>
        </div>
      </div>
    </div>
  )
}
