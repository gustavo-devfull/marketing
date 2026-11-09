import { stripXmlDecl, svgSize } from './svg'

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadSvg(svgString: string, filename: string): void {
  downloadBlob(new Blob([stripXmlDecl(svgString)], { type: 'image/svg+xml' }), filename)
}

/**
 * PDF vetorial com uma página por SVG, no tamanho exato do viewBox (interpretado em `unit`).
 * jsPDF e svg2pdf são carregados sob demanda (são pesados e só servem para exportar).
 */
export async function exportSvgPdf(pages: string[], filename: string, unit: 'mm' | 'pt'): Promise<void> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  let pdf: InstanceType<typeof jsPDF> | null = null
  for (const page of pages) {
    const { w, h } = svgSize(page)
    const orientation = w > h ? 'landscape' : 'portrait'
    if (!pdf) pdf = new jsPDF({ unit, format: [w, h], orientation, compress: true })
    else pdf.addPage([w, h], orientation)

    const host = document.createElement('div')
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:visible;'
    host.innerHTML = stripXmlDecl(page)
    document.body.appendChild(host)
    try {
      await svg2pdf(host.querySelector('svg') as SVGSVGElement, pdf, { x: 0, y: 0, width: w, height: h })
    } finally {
      host.remove()
    }
  }
  pdf?.save(filename)
}
