import { useStore } from '../hooks/useStore'

// GIF de exercício com filtro neon (posterize+tint+glow via SVG, ver NeonGifFilters).
// Cor segue o GER de quem chama: <=10 verde (preparo/leve), >=11 vermelho (intenso) —
// mesmo corte de PHASE_COLOR_PREP/WORKING em WorkoutPage.jsx. Sem `ger` (ex. tela da
// biblioteca, sem contexto de treino), cai no verde. `lite` pula o overlay de
// scanline (mantém o filtro, só evita o custo/ruído extra nas thumbnails da grade).
export default function ExerciseGif({ src, alt, ger = null, lite = false, fit = 'cover', onError }) {
  const neonEnabled = useStore((s) => s.neonGifFilterEnabled)
  const colorCls = ger != null && ger >= 11 ? 'neon-r' : 'neon-g'

  return (
    <div className={`w-full h-full ${neonEnabled && !lite ? 'neon-scan' : ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={onError}
        className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${neonEnabled ? colorCls : ''}`}
      />
    </div>
  )
}
