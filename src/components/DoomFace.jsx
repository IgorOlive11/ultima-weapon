import React from 'react'

const GER_FILES = {
  7: 'ger7.png', 8: 'ger8.png', 9: 'ger9.png', 10: 'ger10.png',
  11: 'ger11.png', 12: 'ger12.png', 13: 'ger13.png',
}

export default function DoomFace({ ger, size = 32, className = '' }) {
  const g = Math.max(7, Math.min(13, Math.round(ger)))
  return (
    <img
      src={`/doom-faces/${GER_FILES[g]}`}
      width={size}
      height={size}
      alt={`GER ${g}`}
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated', flexShrink: 0, display: 'block' }}
    />
  )
}
