import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { productImageUrl } from '../config/images'

interface Props {
  referencia: string
  /** Largura em px. Sem `width`, a imagem ocupa 100% do contêiner. A proporção é sempre 700×500. */
  width?: number
  className?: string
  onClick?: () => void
}

export default function ProductImage({ referencia, width, className = '', onClick }: Props) {
  const [failed, setFailed] = useState(false)
  const style = width ? { width } : undefined
  const base = `${width ? 'shrink-0' : 'w-full'} aspect-[700/500] rounded-md bg-gray-100 ${className}`
  if (failed || !referencia) {
    return (
      <div style={style} className={`flex items-center justify-center text-gray-300 ${base}`}>
        <ImageOff size={width ? Math.max(14, width / 4) : 40} />
      </div>
    )
  }
  return (
    <img
      src={productImageUrl(referencia)}
      alt={referencia}
      loading="lazy"
      style={style}
      onError={() => setFailed(true)}
      onClick={onClick}
      className={`object-cover ${onClick ? 'cursor-zoom-in' : ''} ${base}`}
    />
  )
}
