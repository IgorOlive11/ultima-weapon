// Defs de filtro SVG pra estética "neon" nos GIFs de exercício (fase 3 da lib de
// exercícios). Monta UMA vez na árvore (App.jsx) — <ExerciseGif/> só referencia
// os ids via CSS `filter: invert(1) url(#id)`, sem duplicar os defs por instância.
// Posterização (feComponentTransfer discrete) + tint sólido + glow (blur+merge).
//   neonG — verde, esforço leve/preparo — GER <= 10
//   neonR — vermelho, esforço alto — GER >= 11
export default function NeonGifFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="neonG" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="p">
            <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          </feComponentTransfer>
          <feColorMatrix
            in="p"
            type="matrix"
            values="0.13 0 0 0 0  0.90 0 0 0 0  0.09 0 0 0 0  0 0 0 1 0"
            result="tint"
          />
          <feGaussianBlur in="tint" stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="tint" />
          </feMerge>
        </filter>

        <filter id="neonR" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="p">
            <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          </feComponentTransfer>
          <feColorMatrix
            in="p"
            type="matrix"
            values="0.95 0 0 0 0.02  0.16 0 0 0 0.01  0.14 0 0 0 0.01  0 0 0 1 0"
            result="tint"
          />
          <feGaussianBlur in="tint" stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="tint" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
