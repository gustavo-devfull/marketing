/**
 * Base das imagens dos produtos. Para migrar para Supabase Storage, troque por:
 *   `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/produtos`
 */
export const IMAGE_BASE_URL = 'https://nyc3.digitaloceanspaces.com/moribr/base-fotos'

/** Link do sistema de imagens (defina VITE_IMAGES_SYSTEM_URL na Vercel). */
export const IMAGE_SYSTEM_URL = (import.meta.env.VITE_IMAGES_SYSTEM_URL as string | undefined) || ''

export function productImageUrl(referencia: string): string {
  return `${IMAGE_BASE_URL}/${encodeURIComponent(referencia.trim())}.jpg`
}
