import { useRef, useState, type DragEvent } from 'react'
import { Check, Copy, Download, FileText, Loader2, Pencil, Trash2, Upload, X } from 'lucide-react'
import { assetDownloadUrl, assetUrl, AssetService } from '../services/assetService'
import { formatBytes } from '../lib/summary'
import { ASSET_TYPES, type Asset, type AssetType } from '../types'

interface Props {
  referencia: string
  tipo: AssetType
  assets: Asset[]
  loading: boolean
  canWrite: boolean
  onUploaded: (a: Asset) => void
  onUpdated: (a: Asset) => void
  onRemoved: (a: Asset) => void
  onError: (e: unknown) => void
  onNotify: (msg: string) => void
}

const isImage = (a: Asset) => /^image\//.test(a.mimeType) || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(a.fileName)
const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.toUpperCase().slice(0, 5) : 'ARQ')

export default function FilesTab({ referencia, tipo, assets, loading, canWrite, onUploaded, onUpdated, onRemoved, onError, onNotify }: Props) {
  const info = ASSET_TYPES.find((t) => t.key === tipo)!
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [editing, setEditing] = useState<{ id: string; titulo: string; tipo: AssetType } | null>(null)
  const [busyId, setBusyId] = useState('')
  const [zoom, setZoom] = useState<Asset | null>(null)

  async function upload(files: File[]) {
    if (!files.length || progress) return
    setProgress({ done: 0, total: files.length })
    let ok = 0
    for (let i = 0; i < files.length; i++) {
      try {
        onUploaded(await AssetService.upload(referencia, tipo, files[i]))
        ok++
      } catch (e) {
        onError(e instanceof Error && e.name !== 'PermissionError' ? new Error(`${files[i].name}: ${e.message}`) : e)
        if (e instanceof Error && e.name === 'PermissionError') break
      }
      setProgress({ done: i + 1, total: files.length })
    }
    setProgress(null)
    if (ok) onNotify(ok === 1 ? 'Arquivo enviado' : `${ok} arquivos enviados`)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (canWrite) void upload(Array.from(e.dataTransfer.files))
  }

  async function saveEdit() {
    if (!editing) return
    setBusyId(editing.id)
    try {
      onUpdated(await AssetService.update(editing.id, { titulo: editing.titulo.trim(), tipo: editing.tipo }))
      setEditing(null)
    } catch (e) { onError(e) } finally { setBusyId('') }
  }

  async function remove(a: Asset) {
    if (!confirm(`Excluir "${a.titulo || a.fileName}"? O arquivo é apagado definitivamente.`)) return
    setBusyId(a.id)
    try {
      await AssetService.remove(a)
      onRemoved(a)
      onNotify('Arquivo excluído')
    } catch (e) { onError(e) } finally { setBusyId('') }
  }

  async function copyLink(a: Asset) {
    try {
      await navigator.clipboard.writeText(assetUrl(a))
      onNotify('Link copiado')
    } catch {
      onError(new Error('Não foi possível copiar o link.'))
    }
  }

  const iconBtn = 'rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-orange-600 disabled:opacity-40'

  return (
    <section>
      <div
        onDragOver={(e) => { e.preventDefault(); if (canWrite) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 ${dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'}`}
      >
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => { void upload(Array.from(e.target.files ?? [])); e.target.value = '' }} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!canWrite || !!progress}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {progress ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {progress ? `Enviando ${Math.min(progress.done + 1, progress.total)} de ${progress.total}…` : 'Enviar arquivos'}
        </button>
        <p className="text-sm text-gray-500">
          {canWrite ? <>ou arraste os arquivos para cá. {info.hint}</> : <>Seu perfil é somente consulta: enviar arquivos exige o perfil admin ou marketing.</>}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500"><Loader2 className="animate-spin" /> Carregando…</div>
      ) : assets.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Nenhum arquivo em “{info.label}” para {referencia}.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => {
            const edit = editing?.id === a.id ? editing : null
            return (
              <article key={a.id} className={`flex flex-col rounded-xl border border-gray-100 bg-white p-3 shadow-sm ${busyId === a.id ? 'opacity-50' : ''}`}>
                {isImage(a) ? (
                  <button onClick={() => setZoom(a)} className="block cursor-zoom-in" aria-label={`Ampliar ${a.titulo || a.fileName}`}>
                    <img src={assetUrl(a)} alt={a.titulo || a.fileName} loading="lazy" className="aspect-[4/3] w-full rounded-md bg-gray-100 object-contain" />
                  </button>
                ) : (
                  <a href={assetUrl(a)} target="_blank" rel="noreferrer" className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-md bg-gray-100 text-gray-400 hover:text-orange-500">
                    <FileText size={36} />
                    <span className="text-xs font-semibold">{ext(a.fileName)}</span>
                  </a>
                )}

                {edit ? (
                  <div className="mt-2 flex flex-col gap-2 text-sm">
                    <input
                      autoFocus
                      value={edit.titulo}
                      onChange={(e) => setEditing({ ...edit, titulo: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                      aria-label="Título"
                      className="w-full rounded-lg border px-2 py-1 outline-none focus:border-orange-400"
                    />
                    <select value={edit.tipo} onChange={(e) => setEditing({ ...edit, tipo: e.target.value as AssetType })} aria-label="Categoria" className="w-full rounded-lg border bg-white px-2 py-1 outline-none focus:border-orange-400">
                      {ASSET_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(null)} className={iconBtn} title="Cancelar"><X size={16} /></button>
                      <button onClick={saveEdit} className="rounded p-1.5 text-green-600 hover:bg-green-50" title="Salvar"><Check size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 min-w-0 flex-1 text-sm">
                      <h3 className="truncate font-medium text-gray-800" title={a.titulo || a.fileName}>{a.titulo || a.fileName}</h3>
                      <p className="truncate text-xs text-gray-400" title={a.fileName}>{a.fileName}</p>
                      <p className="text-xs text-gray-400">{formatBytes(a.sizeBytes)} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                      <a href={assetDownloadUrl(a)} className={iconBtn} title="Baixar"><Download size={16} /></a>
                      <button onClick={() => copyLink(a)} className={iconBtn} title="Copiar link"><Copy size={16} /></button>
                      <button onClick={() => setEditing({ id: a.id, titulo: a.titulo, tipo: a.tipo })} disabled={!canWrite} className={iconBtn} title="Renomear / mover de categoria"><Pencil size={16} /></button>
                      <button onClick={() => remove(a)} disabled={!canWrite} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          <button className="absolute right-4 top-4 text-white" aria-label="Fechar"><X size={28} /></button>
          <img src={assetUrl(zoom)} alt={zoom.titulo || zoom.fileName} className="max-h-full max-w-full rounded-lg bg-white object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  )
}
