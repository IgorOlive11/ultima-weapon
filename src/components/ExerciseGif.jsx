import { useStore } from '../hooks/useStore'

// GIF de exercício com filtro neon (duotone via SVG, ver NeonGifFilters). Cor
// segue o GER de quem chama: <=10 verde (preparo/leve), >=11 vermelho (intenso) —
// mesmo corte de PHASE_COLOR_PREP/WORKING em WorkoutPage.jsx. Sem `ger` (ex. tela
// da biblioteca, sem contexto de treino), cai no verde. `lite` usa o filtro mais
// sutil (sem glow/scanline) pra thumbnails pequenas na grade.
export default function ExerciseGif({ src, alt, ger = null, lite = false, fit = 'cover', onError }) {
  const neonEnabled = useStore((s) => s.neonGifFilterEnabled)
  const filterId = lite ? 'neonGlite' : ger != null && ger >= 11 ? 'neonR' : 'neonG'

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={onError}
        style={neonEnabled ? { filter: `url(#${filterId})` } : undefined}
        className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
      />
      {neonEnabled && !lite && <div className="gif-scan" />}
    </div>
  )
}
