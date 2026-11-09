import JsBarcode from 'jsbarcode'
import { loadManropeFont, loadOCRBFont, type OTFont } from './fonts'
import { NS, offscreenSvg } from './svg'
import type { LabelModel } from '../types'

// Etiqueta EAN-13 de 40 × 30 mm (logo + dados do importador + código de barras), 100% em curvas.

export const LABEL_MODELS: Record<LabelModel, { name: string; background: string; email: string }> = {
  mori: { name: 'Mori', background: '/templates/fundo-ean13.svg', email: 'sac@moribr.com' },
  ravi: { name: 'Ravi', background: '/templates/fundo-ean13-ravi.svg', email: 'sac@ravi.com.br' },
}

// Fundo oficial (logo + linha divisória), extraído da arte em PDF para SVG.
const fundoCache: Partial<Record<LabelModel, Promise<string>>> = {}
function loadFundoInner(model: LabelModel): Promise<string> {
  if (!fundoCache[model]) {
    fundoCache[model] = fetch(LABEL_MODELS[model].background)
      .then((r) => {
        if (!r.ok) throw new Error('Não foi possível carregar o fundo da etiqueta.')
        return r.text()
      })
      .then((svgText) => {
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
        if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') {
          throw new Error(`O fundo do modelo ${LABEL_MODELS[model].name} está inválido.`)
        }
        return new XMLSerializer()
          .serializeToString(doc.documentElement)
          .replace(/^<svg[^>]*>/, '')
          .replace(/<\/svg>\s*$/, '')
      })
      .catch((err) => {
        delete fundoCache[model]
        throw err
      })
  }
  return fundoCache[model]!
}

// ── Dados fixos do importador ────────────────────────────────────────────────
const EMPRESA = 'Ravi Presentes Ltda.'
const CNPJ = '65.484.453/0001-86'
const ENDERECO = 'R. Djalma Capistrano da Silva, 471 - Araraquara/SP'

// ── Layout (mm) ──────────────────────────────────────────────────────────────
export const LABEL_W = 40
export const LABEL_H = 30
const FILL_DARK = '#231f20' // mesmo tom da logo

// A logo mede ~10,3 × 7,5 mm e fica no topo esquerdo; a linha divisória fica em y≈8,74 mm.
const HEADER_X = 13.5
const NOME_Y = 3.6, NOME_LINE_H = 2.8, NOME_SIZE = 2.3
const DIVIDER_X2 = 38.2
const LOTE_Y = 9.1, LOTE_SIZE = 1.65
const BODY_X = 1.8, BODY_START_Y = 11.0, BODY_LINE_H = 1.65, BODY_SIZE = 1.8

// Código de barras: 30 mm de largura; o topo das barras é cortado até caber (a base fica intacta).
const BARCODE_MODULE_W = 1.1
const BARCODE_W = 30
const BARCODE_BOTTOM_MARGIN = 0.3
const BARCODE_Y = BODY_START_Y + 5 * BODY_LINE_H + 0.7
const BARCODE_H = LABEL_H - BARCODE_BOTTOM_MARGIN - BARCODE_Y
const BARCODE_X = (LABEL_W - BARCODE_W) / 2
// 1 = base dos dígitos alinhada à base das barras-guarda.
const BARCODE_DIGITS_GAP_CLOSE = 1
// Redução de traço proporcional ao módulo (um valor fixo em mm apagaria as barras finas neste tamanho).
const BAR_OUTLINE_NATIVE = BARCODE_MODULE_W * 0.12

type Anchor = 'start' | 'middle' | 'end'

function pathTag(font: OTFont, text: string, x: number, y: number, size: number, fill: string, anchor: Anchor = 'start'): string {
  if (!text.trim()) return ''
  let drawX = x
  if (anchor === 'middle') drawX = x - font.getAdvanceWidth(text, size) / 2
  else if (anchor === 'end') drawX = x - font.getAdvanceWidth(text, size)
  return `<path d="${font.getPath(text, drawX, y, size).toPathData(3)}" fill="${fill}"/>`
}

// Texto em curvas não tem "overflow: hidden": se passar da coluna, encolhe a fonte até caber.
function fitPathTag(font: OTFont, text: string, x: number, y: number, maxWidth: number, baseSize: number, fill: string, anchor: Anchor = 'start', minSize = 1.1): string {
  if (!text.trim()) return ''
  const width = font.getAdvanceWidth(text, baseSize)
  const size = width > maxWidth ? Math.max(minSize, baseSize * (maxWidth / width)) : baseSize
  return pathTag(font, text, x, y, size, fill, anchor)
}

// Palavras que começam com um código de referência (RM/RV/MR + dígitos, sufixo opcional) saem em negrito.
const CODE_PREFIX_RE = /^(RM|RV|MR)\d+(-[A-Za-z0-9]+)?/i

interface WordFragment { text: string; font: OTFont }
type Word = WordFragment[]

function buildNomeWords(nomeProduto: string, regularFont: OTFont, boldFont: OTFont): Word[] {
  return nomeProduto.trim().split(/\s+/).filter(Boolean).map((raw): Word => {
    const match = raw.match(CODE_PREFIX_RE)
    if (!match) return [{ text: raw, font: regularFont }]
    const code = match[0]
    const rest = raw.slice(code.length)
    const word: Word = [{ text: code, font: boldFont }]
    if (rest) word.push({ text: rest, font: regularFont })
    return word
  })
}

// Quebra em até 2 linhas (sem cortar palavras) e, se ainda não couber, encolhe as duas juntas.
function fitTwoLineMixedPathTag(words: Word[], x: number, y: number, lineHeight: number, maxWidth: number, baseSize: number, fill: string, minSize = 1.1): string {
  if (!words.length) return ''
  const wordWidth = (word: Word, size: number) => word.reduce((w, f) => w + f.font.getAdvanceWidth(f.text, size), 0)
  const spaceWidth = (word: Word, size: number) => word[0].font.getAdvanceWidth(' ', size)
  const lineWidth = (line: Word[], size: number) =>
    line.reduce((w, word, i) => w + wordWidth(word, size) + (i > 0 ? spaceWidth(word, size) : 0), 0)

  let line1: Word[] = [words[0]]
  let i = 1
  for (; i < words.length; i++) {
    const candidate = [...line1, words[i]]
    if (lineWidth(candidate, baseSize) > maxWidth) break
    line1 = candidate
  }
  const line2 = words.slice(i)

  const widest = Math.max(lineWidth(line1, baseSize), line2.length ? lineWidth(line2, baseSize) : 0)
  const size = widest > maxWidth ? Math.max(minSize, baseSize * (maxWidth / widest)) : baseSize

  const renderLine = (line: Word[], ly: number) => {
    let cursorX = x
    let out = ''
    line.forEach((word, idx) => {
      for (const frag of word) {
        out += pathTag(frag.font, frag.text, cursorX, ly, size, fill, 'start')
        cursorX += frag.font.getAdvanceWidth(frag.text, size)
      }
      if (idx < line.length - 1) cursorX += spaceWidth(word, size)
    })
    return out
  }
  return renderLine(line1, y) + renderLine(line2, y + lineHeight)
}

// ── Código de barras: barras e dígitos em unidades nativas do JsBarcode ──────
interface RawBar { x: number; y: number; w: number; h: number }
interface RawDigit { text: string; x: number; y: number; fontSize: number; anchor: string }
interface RawBarcode { bars: RawBar[]; digits: RawDigit[]; width: number; height: number }

function generateBarcodeRaw(code: string): RawBarcode {
  const { svg, host } = offscreenSvg()
  try {
    JsBarcode(svg, code, {
      format: 'EAN13',
      width: BARCODE_MODULE_W,
      height: 120,
      displayValue: true,
      font: 'OCR-B, monospace',
      fontSize: 44,
      textMargin: 4,
      margin: 4,
      lineColor: '#000000',
      background: '#ffffff',
    })

    // Cada barra/dígito fica num <g transform="translate(tx,ty)">: soma o deslocamento do grupo.
    const bars: RawBar[] = []
    const digits: RawDigit[] = []
    Array.from(svg.querySelectorAll('g')).forEach((g) => {
      const m = (g.getAttribute('transform') ?? '').match(/translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*\)/)
      const tx = m ? parseFloat(m[1]) : 0
      const ty = m ? parseFloat(m[2]) : 0
      Array.from(g.children).forEach((child) => {
        if (child.tagName === 'rect') {
          const fill = (child.getAttribute('fill') ?? '').toLowerCase()
          if (fill === '#ffffff' || fill === 'white') return
          bars.push({
            x: tx + parseFloat(child.getAttribute('x') ?? '0'),
            y: ty + parseFloat(child.getAttribute('y') ?? '0'),
            w: parseFloat(child.getAttribute('width') ?? '0'),
            h: parseFloat(child.getAttribute('height') ?? '0'),
          })
        } else if (child.tagName === 'text') {
          const text = child.textContent ?? ''
          if (!text.trim()) return
          digits.push({
            text,
            x: tx + parseFloat(child.getAttribute('x') ?? '0'),
            y: ty + parseFloat(child.getAttribute('y') ?? '0'),
            // O JsBarcode define a fonte via style (sem atributo font-size): os dígitos saem em 22,
            // metade do corpo reservado no layout — é o tamanho aprovado da etiqueta.
            fontSize: parseFloat(child.getAttribute('font-size') ?? '') || 22,
            anchor: child.getAttribute('text-anchor') ?? 'start',
          })
        }
      })
    })
    return {
      bars,
      digits,
      width: parseFloat(svg.getAttribute('width') ?? '300'),
      height: parseFloat(svg.getAttribute('height') ?? '150'),
    }
  } finally {
    host.remove()
  }
}

// Corta `trim` unidades do topo de cada barra e sobe os dígitos em `digitYShift`.
function renderBarcodeInner(raw: RawBarcode, trim: number, ocrFont: OTFont, digitYShift: number): string {
  const parts: string[] = []
  for (const b of raw.bars) {
    const y = b.y + trim
    const h = Math.max(0.3, b.h - trim)
    parts.push(`<path d="M${b.x},${y} L${b.x + b.w},${y} L${b.x + b.w},${y + h} L${b.x},${y + h} Z" fill="#000000" stroke="#ffffff" stroke-width="${BAR_OUTLINE_NATIVE.toFixed(4)}"/>`)
  }
  for (const d of raw.digits) {
    parts.push(pathTag(ocrFont, d.text, d.x, d.y - digitYShift, d.fontSize, '#000000', d.anchor as Anchor))
  }
  return parts.join('')
}

export interface Ean13LabelInput {
  model: LabelModel
  code: string
  nomeProduto: string
  lote: string
  quantidade: string
  composicao: string
  validade: string
  fabricadoEm: string
}

export async function buildEan13LabelSvg(p: Ean13LabelInput): Promise<string> {
  const [manrope, manropeBold, ocrFont, fundoInner] = await Promise.all([
    loadManropeFont('regular'),
    loadManropeFont('bold'),
    loadOCRBFont(),
    loadFundoInner(p.model),
  ])
  const raw = generateBarcodeRaw(p.code)

  const parts: string[] = [`<rect x="0" y="0" width="${LABEL_W}" height="${LABEL_H}" fill="#ffffff"/>`, fundoInner]

  // Nome do produto: até 2 linhas, código de referência em negrito.
  const headerMaxW = DIVIDER_X2 - HEADER_X
  parts.push(fitTwoLineMixedPathTag(buildNomeWords(p.nomeProduto, manrope, manropeBold), HEADER_X, NOME_Y, NOME_LINE_H, headerMaxW, NOME_SIZE, FILL_DARK))

  if (p.lote.trim()) parts.push(fitPathTag(manrope, `Lote ${p.lote}`, DIVIDER_X2, LOTE_Y, headerMaxW, LOTE_SIZE, FILL_DARK, 'end'))

  const bodyMaxW = DIVIDER_X2 - BODY_X
  const bodyLines = [
    'Importado por:',
    `${EMPRESA} CNPJ: ${CNPJ}`,
    ENDERECO,
    `Qtd.: ${p.quantidade}. Composição: ${p.composicao}.`,
    p.validade,
    `${LABEL_MODELS[p.model].email}  |  Fabricado na ${p.fabricadoEm}`,
  ]
  bodyLines.forEach((line, i) => {
    parts.push(fitPathTag(manrope, line, BODY_X, BODY_START_Y + i * BODY_LINE_H, bodyMaxW, BODY_SIZE, FILL_DARK, 'start', 0.85))
  })

  // Escala só pela largura e corta o topo das barras para caber na altura disponível.
  const scale = BARCODE_W / raw.width
  const nativeTargetH = BARCODE_H / scale
  const minBarH = Math.min(...raw.bars.map((b) => b.h))
  const trim = Math.min(Math.max(0, raw.height - nativeTargetH), minBarH - 0.5)

  const maxBarBottom = Math.max(...raw.bars.map((b) => b.y + b.h))
  const minDigitBaseline = Math.min(...raw.digits.map((d) => d.y))
  const digitYShift = (minDigitBaseline - maxBarBottom) * BARCODE_DIGITS_GAP_CLOSE
  const inner = renderBarcodeInner(raw, trim, ocrFont, digitYShift)
  parts.push(`<g transform="translate(${BARCODE_X.toFixed(3)},${BARCODE_Y.toFixed(3)}) scale(${scale.toFixed(6)}) translate(0,${(-trim).toFixed(3)})">${inner}</g>`)

  return `<svg xmlns="${NS}" viewBox="0 0 ${LABEL_W} ${LABEL_H}" width="${LABEL_W}mm" height="${LABEL_H}mm">${parts.join('')}</svg>`
}
