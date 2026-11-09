import { pickFont } from './fonts'

export const NS = 'http://www.w3.org/2000/svg'

export const stripXmlDecl = (s: string) => s.replace(/^<\?xml[^?]*\?>\s*/, '')

/** Cria um <svg> fora da tela (JsBarcode e svg2pdf precisam do elemento no DOM). */
export function offscreenSvg(): { svg: SVGSVGElement; host: HTMLDivElement } {
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:visible;'
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  host.appendChild(svg)
  document.body.appendChild(host)
  return { svg, host }
}

/**
 * Converte todo <text> em <path> (curvas) com opentype.js, para o arquivo não depender de fontes instaladas.
 * Os <image> (base64 grande) são retirados antes do parse e devolvidos depois, para não corromper nem pesar.
 */
export async function vectorizeAllText(svgString: string, defaultAnchor: 'start' | 'middle' = 'start'): Promise<string> {
  const images: string[] = []
  const withPlaceholders = svgString.replace(/<image[\s\S]*?\/>/g, (match) => {
    images.push(match)
    return `<rect data-img="${images.length - 1}" x="0" y="0" width="0" height="0"/>`
  })

  const doc = new DOMParser().parseFromString(stripXmlDecl(withPlaceholders), 'image/svg+xml')
  doc.documentElement.querySelectorAll('style').forEach((s) => s.remove())

  for (const textEl of Array.from(doc.querySelectorAll('text'))) {
    const text = textEl.textContent ?? ''
    if (!text.trim()) {
      textEl.remove()
      continue
    }
    const x = parseFloat(textEl.getAttribute('x') ?? '0')
    const y = parseFloat(textEl.getAttribute('y') ?? '0')
    const fontSize = parseFloat(textEl.getAttribute('font-size') ?? '14')
    const anchor = textEl.getAttribute('text-anchor') ?? defaultAnchor
    const fill = textEl.getAttribute('fill') ?? textEl.parentElement?.getAttribute('fill') ?? '#000000'
    const font = await pickFont(textEl.getAttribute('font-family') ?? '', textEl.getAttribute('font-weight') ?? '')

    let drawX = x
    if (anchor === 'middle') drawX = x - font.getAdvanceWidth(text, fontSize) / 2
    else if (anchor === 'end') drawX = x - font.getAdvanceWidth(text, fontSize)

    const pathEl = doc.createElementNS(NS, 'path')
    pathEl.setAttribute('d', font.getPath(text, drawX, y, fontSize).toPathData(3))
    pathEl.setAttribute('fill', fill)
    textEl.replaceWith(pathEl)
  }

  let result = new XMLSerializer().serializeToString(doc)
  images.forEach((imgTag, idx) => {
    result = result.replace(new RegExp(`<rect[^>]*data-img="${idx}"[^>]*/>`), () => imgTag)
  })
  return result
}

/** Largura/altura do SVG nas unidades do viewBox (ou dos atributos width/height). */
export function svgSize(svgString: string): { w: number; h: number } {
  const head = svgString.slice(0, svgString.indexOf('>', svgString.indexOf('<svg')) + 1)
  const vb = head.match(/viewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(parseFloat)
  if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { w: vb[2], h: vb[3] }
  return {
    w: parseFloat(head.match(/\swidth="([^"]+)"/)?.[1] ?? '300'),
    h: parseFloat(head.match(/\sheight="([^"]+)"/)?.[1] ?? '150'),
  }
}
