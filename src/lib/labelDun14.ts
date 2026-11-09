import { buildDun14Svg } from './barcode'
import { loadArialFont } from './fonts'
import { NS, stripXmlDecl, vectorizeAllText } from './svg'
import type { LabelModel } from '../types'

// Etiqueta de caixa DUN-14 (2 páginas A4) sobre os templates oficiais Mori / Ravi.

const XLINK = 'http://www.w3.org/1999/xlink'
const FILL_DARK = 'rgb(22.357178%,20.944214%,21.295166%)'

const TEMPLATES: Record<LabelModel, [string, string]> = {
  mori: ['/templates/label-p1.svg', '/templates/label-p2.svg'],
  ravi: ['/templates/ravi-p1.svg', '/templates/ravi-p2.svg'],
}

const templateCache: Record<string, Promise<string>> = {}
function loadTemplate(path: string): Promise<string> {
  if (!templateCache[path]) {
    templateCache[path] = fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`Não foi possível carregar o template ${path}.`)
        return r.text()
      })
      .catch((err) => {
        delete templateCache[path]
        throw err
      })
  }
  return templateCache[path]
}

// Área do código de barras na página 2 (pt).
const BC = { x: 80.578, y: 650.9, w: 430.44, h: 144.94 }

/** Elementos do código de barras (sem o fundo branco), já posicionados na área BC. */
function barcodeGroup(barcodeSvgString: string): string {
  const barcodeSvg = new DOMParser().parseFromString(stripXmlDecl(barcodeSvgString), 'image/svg+xml').querySelector('svg')
  if (!barcodeSvg) return ''
  const vb = (barcodeSvg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(parseFloat)
  const bw = vb[2] ?? 0
  const bh = vb[3] ?? 0
  if (!(bw > 0 && bh > 0)) return ''

  const scale = Math.min(BC.w / bw, BC.h / bh)
  const dx = BC.x + (BC.w - bw * scale) / 2
  const dy = BC.y + (BC.h - bh * scale) / 2
  const inner = Array.from(barcodeSvg.children)
    .filter((child) => {
      if (child.tagName !== 'rect') return true
      const paint = `${child.getAttribute('fill') ?? ''} ${child.getAttribute('style') ?? ''}`.toLowerCase()
      return !/#ffffff|white|100%/.test(paint)
    })
    .map((child) => new XMLSerializer().serializeToString(child))
    .join('')
  return `<g xmlns="${NS}" transform="translate(${dx.toFixed(3)},${dy.toFixed(3)}) scale(${scale.toFixed(6)})">${inner}</g>`
}

function injectBeforeClosingSvg(svgText: string, ...snippets: string[]): string {
  const idx = svgText.lastIndexOf('</svg>')
  if (idx === -1) return svgText + snippets.join('')
  return svgText.slice(0, idx) + snippets.join('') + '</svg>'
}

// ── Mori: remove os textos de exemplo do template e escreve referência / lote ─

function removeGlyphGroupsAtY(doc: Document, targetY: number, hrefPrefix = '', tol = 1): void {
  Array.from(doc.querySelectorAll('g')).forEach((g) => {
    const hit = Array.from(g.querySelectorAll('use')).some((u) => {
      const href = u.getAttributeNS(XLINK, 'href') || u.getAttribute('href') || ''
      return href.startsWith(hrefPrefix) && Math.abs(parseFloat(u.getAttribute('y') ?? '0') - targetY) < tol
    })
    if (hit) g.remove()
  })
}

function appendText(doc: Document, text: string, x: number, y: number, size: number, weight: string, anchor?: string): void {
  const el = doc.createElementNS(NS, 'text')
  el.setAttribute('x', String(x))
  el.setAttribute('y', String(y))
  if (anchor) el.setAttribute('text-anchor', anchor)
  el.setAttribute('font-family', 'Arial, Helvetica, sans-serif')
  el.setAttribute('font-weight', weight)
  el.setAttribute('font-size', String(size))
  el.setAttribute('fill', FILL_DARK)
  el.textContent = text
  doc.documentElement.appendChild(el)
}

function moriPage1(svgText: string, reference: string, lote: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  removeGlyphGroupsAtY(doc, 536.527424, '#glyph-1-')
  removeGlyphGroupsAtY(doc, 704.135072)
  appendText(doc, reference, 297.6, 536.527424, 36, '900', 'middle')
  if (lote.trim()) appendText(doc, `Lote ${lote}`, 297.6, 704.135072, 18, '600', 'middle')
  return new XMLSerializer().serializeToString(doc)
}

function moriPage2(svgText: string, reference: string, barcodeSvg: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  removeGlyphGroupsAtY(doc, 300.244501)
  // Tira a moldura e o código de barras de exemplo do template.
  Array.from(doc.querySelectorAll('path')).forEach((p) => {
    if ((p.getAttribute('stroke') ?? '').includes('92.549133%')) p.remove()
  })
  Array.from(doc.querySelectorAll('path')).forEach((p) => {
    const m = (p.getAttribute('d') ?? '').match(/M\s*([\d.]+)\s*([\d.]+)/)
    if (m && parseFloat(m[2]) > 640 && parseFloat(m[2]) < 800) p.remove()
  })
  appendText(doc, reference, 142.0767, 300.244501, 32, '900')
  return injectBeforeClosingSvg(new XMLSerializer().serializeToString(doc), barcodeGroup(barcodeSvg))
}

// ── Ravi: fundo em imagem; textos injetados direto como <path> ───────────────

async function raviPage1(svgText: string, reference: string, lote: string): Promise<string> {
  const font = await loadArialFont(true)
  const centered = (text: string, y: number, size: number) =>
    `<path d="${font.getPath(text, 297.6 - font.getAdvanceWidth(text, size) / 2, y, size).toPathData(3)}" fill="${FILL_DARK}"/>`
  return injectBeforeClosingSvg(
    svgText,
    centered(reference, 536.527424, 36),
    lote.trim() ? centered(`Lote ${lote}`, 704.135072, 20) : '',
  )
}

async function raviPage2(svgText: string, reference: string, barcodeSvg: string): Promise<string> {
  const font = await loadArialFont(true)
  const ref = `<path d="${font.getPath(reference, 142.0767, 300.244501, 32).toPathData(3)}" fill="${FILL_DARK}"/>`
  return injectBeforeClosingSvg(svgText.replace(/<rect[^>]*class="bc-placeholder"[^>]*\/>/g, ''), ref, barcodeGroup(barcodeSvg))
}

/** Devolve as 2 páginas em SVG, com todo texto já convertido em curvas. */
export async function buildDun14LabelPages(model: LabelModel, code: string, reference: string, lote: string): Promise<[string, string]> {
  const [barcodeSvg, t1, t2] = await Promise.all([
    buildDun14Svg(code, true),
    loadTemplate(TEMPLATES[model][0]),
    loadTemplate(TEMPLATES[model][1]),
  ])
  const pages: [string, string] =
    model === 'mori'
      ? [moriPage1(t1, reference, lote), moriPage2(t2, reference, barcodeSvg)]
      : await Promise.all([raviPage1(t1, reference, lote), raviPage2(t2, reference, barcodeSvg)])
  const [p1, p2] = await Promise.all(pages.map((p) => vectorizeAllText(p)))
  return [stripXmlDecl(p1), stripXmlDecl(p2)]
}
