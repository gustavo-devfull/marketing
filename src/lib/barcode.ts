import JsBarcode from 'jsbarcode'
import { formatDUN14Display } from './barcodeValidation'
import { NS, offscreenSvg, vectorizeAllText } from './svg'

// Código de barras "puro" (sem etiqueta), 100% em curvas: barras e dígitos (OCR-B) viram <path>.

const EAN13_SETTINGS = {
  format: 'EAN13',
  width: 4,
  height: 95,
  displayValue: true,
  font: 'OCR-B, monospace',
  fontSize: 46,
  textMargin: 3,
  margin: 10,
  lineColor: '#000000',
  background: '#ffffff',
}

const dun14Settings = (code: string, forLabel: boolean) => ({
  format: 'ITF14',
  width: forLabel ? 2.8 : 4,
  height: forLabel ? 80 : 110,
  displayValue: true,
  text: formatDUN14Display(code),
  font: 'OCR-B, monospace',
  fontSize: forLabel ? 30 : 34,
  textMargin: forLabel ? 8 : 14,
  margin: forLabel ? 6 : 18,
  lineColor: '#000000',
  background: '#ffffff',
})

// Redução de traço: contorno branco de 0,5pt em cada barra (compensa o ganho de ponto na impressão).
const BAR_STROKE_W = (0.5 * 96) / 72

function convertBarsToPaths(svg: SVGSVGElement): void {
  for (const rect of Array.from(svg.querySelectorAll('rect'))) {
    const fill = (rect.getAttribute('fill') ?? '').toLowerCase()
    if (fill === '#ffffff' || fill === 'white') continue
    // Sem `fill` próprio = barra (herda do <g>); o fundo do JsBarcode usa style="fill:…".
    if (!fill && rect.getAttribute('style')) continue
    const x = parseFloat(rect.getAttribute('x') ?? '0')
    const y = parseFloat(rect.getAttribute('y') ?? '0')
    const w = parseFloat(rect.getAttribute('width') ?? '0')
    const h = parseFloat(rect.getAttribute('height') ?? '0')
    const path = document.createElementNS(NS, 'path')
    path.setAttribute('d', `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`)
    path.setAttribute('fill', fill || '#000000')
    path.setAttribute('stroke', '#ffffff')
    path.setAttribute('stroke-width', BAR_STROKE_W.toFixed(4))
    rect.replaceWith(path)
  }
}

function serialize(svg: SVGSVGElement): string {
  const w = svg.getAttribute('width') ?? ''
  const h = svg.getAttribute('height') ?? ''
  if (!svg.getAttribute('viewBox') && w && h) svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`)
  return new XMLSerializer().serializeToString(svg)
}

export async function buildEan13Svg(code: string): Promise<string> {
  const { svg, host } = offscreenSvg()
  try {
    JsBarcode(svg, code, EAN13_SETTINGS)

    // Dígitos em 46px na mesma linha de base; o 1º dígito (fora das barras) alinhado à esquerda.
    const firstDigitGroup = Array.from(svg.querySelectorAll('g')).find((g) => {
      const t = g.querySelector('text')
      return t && (t.textContent ?? '').trim().length === 1
    })
    svg.querySelectorAll('text').forEach((t) => {
      t.setAttribute('font-size', '46')
      t.setAttribute('y', '130')
    })
    if (firstDigitGroup) {
      firstDigitGroup.setAttribute('transform', 'translate(10, 10)')
      const t = firstDigitGroup.querySelector('text')!
      t.setAttribute('text-anchor', 'start')
      t.setAttribute('x', '15')
    }

    convertBarsToPaths(svg)
    return await vectorizeAllText(serialize(svg))
  } finally {
    host.remove()
  }
}

/** `forLabel`: proporções usadas dentro da etiqueta de caixa (mais compacto). */
export async function buildDun14Svg(code: string, forLabel = false): Promise<string> {
  const { svg, host } = offscreenSvg()
  try {
    JsBarcode(svg, code, dun14Settings(code, forLabel))
    svg.querySelectorAll('text').forEach((t) => {
      t.setAttribute('font-size', forLabel ? '30' : '34')
      if (!forLabel) t.setAttribute('y', '160')
    })
    return await vectorizeAllText(serialize(svg), 'middle')
  } finally {
    host.remove()
  }
}
