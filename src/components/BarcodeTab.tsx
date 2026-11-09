import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Save, Wand2 } from 'lucide-react'
import { buildDun14Svg, buildEan13Svg } from '../lib/barcode'
import { calculateDUNCheckDigit, calculateEANCheckDigit, dunFromEan, isValidDUN14, isValidEAN13 } from '../lib/barcodeValidation'
import { downloadSvg, exportSvgPdf } from '../lib/download'
import { buildDun14LabelPages } from '../lib/labelDun14'
import { buildEan13LabelSvg, LABEL_MODELS } from '../lib/labelEan13'
import { labelDefaults, LabelService } from '../services/labelService'
import type { LabelData, LabelModel, Product } from '../types'

interface Props {
  product: Product
  canWrite: boolean
  onSaved: () => void
  onError: (e: unknown) => void
  onNotify: (msg: string) => void
}

/** Gera algo assíncrono a partir de `deps`, com pequeno atraso para não regenerar a cada tecla. */
function useGenerated<T>(factory: (() => Promise<T>) | null, deps: unknown[]): { value: T | null; error: string; loading: boolean } {
  const [state, setState] = useState<{ value: T | null; error: string; loading: boolean }>({ value: null, error: '', loading: false })
  useEffect(() => {
    if (!factory) {
      setState({ value: null, error: '', loading: false })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, error: '', loading: true }))
    const t = setTimeout(() => {
      factory()
        .then((value) => { if (!cancelled) setState({ value, error: '', loading: false }) })
        .catch((e) => {
          console.error(e)
          if (!cancelled) setState({ value: null, error: e instanceof Error ? e.message : 'Erro ao gerar a prévia.', loading: false })
        })
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

/** Mostra o SVG como imagem (isola estilos/ids do template e não pesa no DOM). */
function SvgPreview({ svg, alt, className = '' }: { svg: string; alt: string; className?: string }) {
  const url = useMemo(() => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), [svg])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt={alt} className={`rounded border border-gray-200 bg-white ${className}`} />
}

function CodeStatus({ code, length, valid, expected }: { code: string; length: number; valid: boolean; expected: () => number }) {
  if (!code) return <span className="text-xs text-gray-400">Informe os {length} dígitos.</span>
  if (valid) return <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={14} /> Código válido</span>
  if (code.length < length) return <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertCircle size={14} /> Faltam {length - code.length} dígitos</span>
  return <span className="inline-flex items-center gap-1 text-xs text-red-600"><AlertCircle size={14} /> Dígito verificador inválido (o correto seria {expected()})</span>
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-gray-600">{label}</span>
      {children}
    </label>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
const btn = 'inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50'
const btnPrimary = 'inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50'

export default function BarcodeTab({ product, canWrite, onSaved, onError, onNotify }: Props) {
  const [form, setForm] = useState<LabelData>(() => labelDefaults(product))
  const [savedJson, setSavedJson] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState('')

  useEffect(() => {
    let cancelled = false
    LabelService.get(product.referencia)
      .then((saved) => {
        if (cancelled || !saved) return
        // Campos nunca preenchidos herdam o padrão vindo do cadastro do produto.
        const d = labelDefaults(product)
        const merged: LabelData = { ...d, ...saved, ean: saved.ean || d.ean, dun: saved.dun || d.dun, nomeProduto: saved.nomeProduto || d.nomeProduto }
        setForm(merged)
        setSavedJson(JSON.stringify(merged))
      })
      // Tabela ausente já é avisada no topo da página; segue com os dados do cadastro.
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [product])

  const set = (patch: Partial<LabelData>) => setForm((f) => ({ ...f, ...patch }))
  const dirty = JSON.stringify(form) !== savedJson
  const ref = product.referencia
  const eanOk = isValidEAN13(form.ean)
  const dunOk = isValidDUN14(form.dun)

  const ean = useGenerated(eanOk ? () => buildEan13Svg(form.ean) : null, [form.ean])
  const eanLabel = useGenerated(
    eanOk
      ? () => buildEan13LabelSvg({
          model: form.modelo,
          code: form.ean,
          nomeProduto: form.nomeProduto || ref,
          lote: form.lote,
          quantidade: form.quantidade,
          composicao: form.composicao,
          validade: form.validade,
          fabricadoEm: form.fabricadoEm,
        })
      : null,
    [form.ean, form.modelo, form.nomeProduto, form.lote, form.quantidade, form.composicao, form.validade, form.fabricadoEm, ref],
  )
  const dun = useGenerated(dunOk ? () => buildDun14Svg(form.dun) : null, [form.dun])
  const dunLabel = useGenerated(dunOk ? () => buildDun14LabelPages(form.modelo, form.dun, ref, form.lote) : null, [form.dun, form.modelo, form.lote, ref])

  async function save() {
    setSaving(true)
    try {
      const saved = await LabelService.save(form)
      const merged = { ...form, ...saved, ean: form.ean, dun: form.dun, nomeProduto: form.nomeProduto }
      setForm(merged)
      setSavedJson(JSON.stringify(merged))
      onNotify('Dados da etiqueta salvos')
      onSaved()
    } catch (e) { onError(e) } finally { setSaving(false) }
  }

  async function pdf(key: string, pages: string[], filename: string, unit: 'mm' | 'pt') {
    setExporting(key)
    try {
      await exportSvgPdf(pages, filename, unit)
    } catch (e) { onError(e) } finally { setExporting('') }
  }

  const pdfLabel = (key: string, text: string) => (exporting === key ? <><Loader2 size={16} className="animate-spin" /> Gerando PDF…</> : <><FileText size={16} /> {text}</>)
  const generating = <p className="flex items-center gap-2 py-6 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Gerando prévia…</p>
  const card = 'rounded-xl border border-gray-100 bg-white p-4 shadow-sm'
  const h3 = 'mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500'

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white" role="group" aria-label="Modelo da etiqueta">
          {(Object.keys(LABEL_MODELS) as LabelModel[]).map((m) => (
            <button key={m} onClick={() => set({ modelo: m })} aria-pressed={form.modelo === m} className={`px-4 py-2 text-sm font-medium ${form.modelo === m ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {LABEL_MODELS[m].name}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">Modelo das etiquetas</span>
        <div className="ml-auto flex items-center gap-3">
          {!loaded ? <span className="text-xs text-gray-400">Carregando dados salvos…</span>
            : !savedJson ? <span className="text-xs text-gray-400">Dados vindos do cadastro (ainda não salvos)</span>
            : dirty ? <span className="text-xs text-amber-600">Alterações não salvas</span>
            : <span className="text-xs text-gray-400">Tudo salvo</span>}
          <button onClick={save} disabled={saving || !loaded || !dirty} className={btnPrimary} title={canWrite ? '' : 'Requer login'}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar dados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── EAN-13 ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className={card}>
            <h3 className={h3}>EAN-13 · unidade</h3>
            <Field label="Código EAN-13">
              <input value={form.ean} onChange={(e) => set({ ean: e.target.value.replace(/\D/g, '').slice(0, 13) })} inputMode="numeric" placeholder="7898258628113" className={`${inputCls} font-mono tracking-wider`} />
            </Field>
            <div className="mt-1"><CodeStatus code={form.ean} length={13} valid={eanOk} expected={() => calculateEANCheckDigit(form.ean.slice(0, 12))} /></div>
            {ean.value ? (
              <>
                <SvgPreview svg={ean.value} alt={`Código de barras EAN-13 ${form.ean}`} className="mt-3 w-full max-w-sm" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => downloadSvg(ean.value!, `ean13-${ref}.svg`)} className={btn}><Download size={16} /> SVG</button>
                  <button onClick={() => pdf('ean', [ean.value!], `ean13-${ref}.pdf`, 'pt')} disabled={!!exporting} className={btn}>{pdfLabel('ean', 'PDF vetorial')}</button>
                </div>
              </>
            ) : ean.loading ? generating : ean.error && <p role="alert" className="mt-3 text-sm text-red-600">{ean.error}</p>}
          </div>

          <div className={card}>
            <h3 className={h3}>Etiqueta EAN-13 · 4 × 3 cm</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome do produto" className="col-span-2">
                <input value={form.nomeProduto} onChange={(e) => set({ nomeProduto: e.target.value })} maxLength={70} placeholder="RM1554 Porta-copo de bambu" className={inputCls} />
              </Field>
              <Field label="Lote">
                <input value={form.lote} onChange={(e) => set({ lote: e.target.value })} maxLength={30} placeholder="3108/26" className={inputCls} />
              </Field>
              <Field label="Quantidade">
                <input value={form.quantidade} onChange={(e) => set({ quantidade: e.target.value })} maxLength={40} placeholder="6 unidades" className={inputCls} />
              </Field>
              <Field label="Composição">
                <input value={form.composicao} onChange={(e) => set({ composicao: e.target.value })} maxLength={40} placeholder="Bambu" className={inputCls} />
              </Field>
              <Field label="Fabricado em">
                <input value={form.fabricadoEm} onChange={(e) => set({ fabricadoEm: e.target.value })} maxLength={30} placeholder="China" className={inputCls} />
              </Field>
              <Field label="Validade / observação" className="col-span-2">
                <input value={form.validade} onChange={(e) => set({ validade: e.target.value })} maxLength={80} className={inputCls} />
              </Field>
            </div>
            {!eanOk ? <p className="mt-3 text-sm text-gray-400">Informe um EAN-13 válido para gerar a etiqueta.</p>
              : eanLabel.value ? (
                <>
                  <SvgPreview svg={eanLabel.value} alt={`Etiqueta EAN-13 de ${ref}`} className="mt-3 w-full max-w-md shadow" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => downloadSvg(eanLabel.value!, `etiqueta-ean13-${ref}.svg`)} className={btn}><Download size={16} /> SVG</button>
                    <button onClick={() => pdf('eanLabel', [eanLabel.value!], `etiqueta-ean13-${ref}.pdf`, 'mm')} disabled={!!exporting} className={btnPrimary}>{pdfLabel('eanLabel', 'PDF vetorial (4 × 3 cm)')}</button>
                  </div>
                </>
              ) : eanLabel.loading ? generating : <p role="alert" className="mt-3 text-sm text-red-600">{eanLabel.error}</p>}
          </div>
        </div>

        {/* ── DUN-14 ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className={card}>
            <h3 className={h3}>DUN-14 · caixa</h3>
            <Field label="Código DUN-14">
              <input value={form.dun} onChange={(e) => set({ dun: e.target.value.replace(/\D/g, '').slice(0, 14) })} inputMode="numeric" placeholder="17898258628110" className={`${inputCls} font-mono tracking-wider`} />
            </Field>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <CodeStatus code={form.dun} length={14} valid={dunOk} expected={() => calculateDUNCheckDigit(form.dun.slice(0, 13))} />
              {eanOk && form.dun !== dunFromEan(form.ean) && (
                <button onClick={() => set({ dun: dunFromEan(form.ean) })} className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline" title="Indicador logístico 1 + 12 primeiros dígitos do EAN + novo dígito verificador">
                  <Wand2 size={14} /> Gerar a partir do EAN ({dunFromEan(form.ean)})
                </button>
              )}
            </div>
            {dun.value ? (
              <>
                <SvgPreview svg={dun.value} alt={`Código de barras DUN-14 ${form.dun}`} className="mt-3 w-full max-w-md" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => downloadSvg(dun.value!, `dun14-${ref}.svg`)} className={btn}><Download size={16} /> SVG</button>
                  <button onClick={() => pdf('dun', [dun.value!], `dun14-${ref}.pdf`, 'pt')} disabled={!!exporting} className={btn}>{pdfLabel('dun', 'PDF vetorial')}</button>
                </div>
              </>
            ) : dun.loading ? generating : dun.error && <p role="alert" className="mt-3 text-sm text-red-600">{dun.error}</p>}
          </div>

          <div className={card}>
            <h3 className={h3}>Etiqueta DUN-14 · caixa (A4, 2 páginas)</h3>
            <p className="text-sm text-gray-500">Usa a referência <strong>{ref}</strong>, o modelo <strong>{LABEL_MODELS[form.modelo].name}</strong> e o lote{form.lote ? <> <strong>{form.lote}</strong></> : ' (não informado)'}.</p>
            {!dunOk ? <p className="mt-3 text-sm text-gray-400">Informe um DUN-14 válido para gerar a etiqueta.</p>
              : dunLabel.value ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <SvgPreview svg={dunLabel.value[0]} alt={`Etiqueta DUN-14 de ${ref}, página 1`} className="w-full shadow" />
                    <SvgPreview svg={dunLabel.value[1]} alt={`Etiqueta DUN-14 de ${ref}, página 2`} className="w-full shadow" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => downloadSvg(dunLabel.value![0], `etiqueta-dun14-${form.modelo}-p1-${ref}.svg`)} className={btn}><Download size={16} /> SVG pág. 1</button>
                    <button onClick={() => downloadSvg(dunLabel.value![1], `etiqueta-dun14-${form.modelo}-p2-${ref}.svg`)} className={btn}><Download size={16} /> SVG pág. 2</button>
                    <button onClick={() => pdf('dunLabel', dunLabel.value!, `etiqueta-dun14-${form.modelo}-${ref}.pdf`, 'pt')} disabled={!!exporting} className={btnPrimary}>{pdfLabel('dunLabel', 'PDF vetorial (2 páginas)')}</button>
                  </div>
                </>
              ) : dunLabel.loading ? generating : <p role="alert" className="mt-3 text-sm text-red-600">{dunLabel.error}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
