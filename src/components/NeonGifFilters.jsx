// Defs de filtro SVG pra estética "neon" nos GIFs de exercício (fase 3 da lib de
// exercícios). Monta UMA vez na árvore (App.jsx) — <ExerciseGif/> só referencia
// os ids via `filter: url(#id)` no <img>, sem duplicar os defs por instância.
//
// Duotone: dessatura pra luminância e remapeia sombra→destaque pra uma cor sólida.
//   neonG     — verde (#39FF14), esforço leve/preparo — GER <= 10
//   neonR     — vermelho (#FF1414), esforço alto — GER >= 11
//   neonGlite — verde mais sutil, pra thumbnails pequenas da grade da biblioteca
const LUMINANCE = `
  0.2126 0.7152 0.0722 0 0
  0.2126 0.7152 0.0722 0 0
  0.2126 0.7152 0.0722 0 0
  0      0      0      1 0
`

export default function NeonGifFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="neonG" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={LUMINANCE} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.02 0.22" />
            <feFuncG type="table" tableValues="0.02 1.0" />
            <feFuncB type="table" tableValues="0.02 0.08" />
          </feComponentTransfer>
        </filter>

        <filter id="neonR" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={LUMINANCE} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.02 1.0" />
            <feFuncG type="table" tableValues="0.02 0.08" />
            <feFuncB type="table" tableValues="0.02 0.08" />
          </feComponentTransfer>
        </filter>

        <filter id="neonGlite" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={LUMINANCE} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.03 0.18" />
            <feFuncG type="table" tableValues="0.03 0.85" />
            <feFuncB type="table" tableValues="0.03 0.10" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  )
}
