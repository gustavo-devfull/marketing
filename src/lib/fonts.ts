import opentype from 'opentype.js'

export type OTFont = ReturnType<typeof opentype.loadSync>

const cache: Record<string, Promise<OTFont>> = {}

function loadFont(path: string): Promise<OTFont> {
  if (!cache[path]) {
    cache[path] = new Promise<OTFont>((resolve, reject) => {
      opentype.load(path, (err, font) => {
        if (err || !font) {
          delete cache[path]
          reject(err || new Error(`Fonte não carregada: ${path}`))
        } else resolve(font)
      })
    })
  }
  return cache[path]
}

export type ManropeWeight = 'regular' | 'bold' | 'extrabold'
const MANROPE: Record<ManropeWeight, string> = {
  regular: '/fonts/Manrope-Regular.ttf',
  bold: '/fonts/Manrope-Bold.ttf',
  extrabold: '/fonts/Manrope-ExtraBold.ttf',
}

export const loadManropeFont = (weight: ManropeWeight = 'regular') => loadFont(MANROPE[weight])
export const loadOCRBFont = () => loadFont('/fonts/OCR-B.ttf')
export const loadArialFont = (bold = false) => loadFont(bold ? '/fonts/Arial-Bold.ttf' : '/fonts/Arial.ttf')

/** Escolhe a fonte pelos atributos font-family / font-weight de um <text>. */
export function pickFont(fontFamily: string, fontWeight: string): Promise<OTFont> {
  if (/arial/i.test(fontFamily)) return loadArialFont(/bold|700|800|900/i.test(fontWeight))
  return loadOCRBFont()
}
