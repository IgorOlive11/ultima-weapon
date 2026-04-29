const ASPECT = 31 / 24

// Accepts either:
//   ger={10}         (number)
//   face="ger10"     (string from GER_CONFIG[n].face)
export default function DoomFace({ ger, face, size = 32, className = '' }) {
  let g
  if (face && typeof face === 'string') {
    g = parseInt(face.replace('ger', ''), 10)
  } else {
    g = Math.round(Number(ger))
  }
  g = Math.max(7, Math.min(13, g || 10))

  const h = Math.round(size * ASPECT)
  return (
    <img
      src={`/doom-faces/ger${g}.png`}
      width={size}
      height={h}
      alt={`GER ${g}`}
      className={`doom-face-anim ${className}`}
      style={{ width: size, height: h, imageRendering: 'pixelated', flexShrink: 0, display: 'block' }}
    />
  )
}
