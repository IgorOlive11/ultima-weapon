import { motion, useReducedMotion } from 'framer-motion'
import {
  PiBarbellBold,
  PiTimerBold,
  PiWifiSlashBold,
  PiChartLineUpBold,
  PiArrowRightBold,
} from 'react-icons/pi'
import AsciiRadar from '@/components/originkit/ui/ascii-radar'

/* ────────────────────────────────────────────────────────────────────────────
   Landing de teste. Aplicacao do skill design-taste-frontend numa superficie
   que ele de fato cobre (marketing/landing), com a identidade DOOM-HUD do app.

   Design Read: landing de app de hipertrofia pra quem treina pesado, linguagem
   brutalista/terminal, stack Vite + Tailwind v3 + fontes ja usadas no app,
   movimento mecanico e contido.
   Dials: VARIANCE 8 (assimetrico, anti-centro) / MOTION 5 (micro-interacao,
   reduced-motion respeitado, sem scroll-hijack) / DENSITY 4.
   ──────────────────────────────────────────────────────────────────────────── */

const GER_SCALE = [
  { n: 7,  img: 'ger7.png',  label: 'LEVE' },
  { n: 8,  img: 'ger8.png',  label: 'CONTROLE' },
  { n: 9,  img: 'ger9.png',  label: 'FIRME' },
  { n: 10, img: 'ger10.png', label: 'DURO' },
  { n: 11, img: 'ger11.png', label: 'PERTO' },
  { n: 12, img: 'ger12.png', label: 'QUASE' },
  { n: 13, img: 'ger13.png', label: 'FALHA' },
]

const FEATURES = [
  {
    icon: PiTimerBold,
    title: 'DESCANSO CRONOMETRADO',
    body: 'O timer roda em segundo plano e toca o alarme no fim. Sem contar no relogio de parede.',
    span: 'md:col-span-4',
    tint: true,
  },
  {
    icon: PiBarbellBold,
    title: 'CARGA AUTOMATICA',
    body: 'Voce informa o topo. Ele calcula a rampa de aquecimento e o peso de cada serie.',
    span: 'md:col-span-2',
  },
  {
    icon: PiWifiSlashBold,
    title: 'FUNCIONA OFFLINE',
    body: 'Instala como app pelo navegador. Treina sem sinal no subsolo da academia.',
    span: 'md:col-span-2',
  },
  {
    icon: PiChartLineUpBold,
    title: 'HISTORICO POR EXERCICIO',
    body: 'A ultima carga daquele exercicio aparece na hora. Nao precisa rolar planilha.',
    span: 'md:col-span-4',
  },
]

const STEPS = [
  { title: 'MONTA O PROTOCOLO', body: 'Semanas, dias, exercicios e a faixa de GER de cada serie.' },
  { title: 'REGISTRA AS SERIES', body: 'Carga e reps, serie por serie, com o descanso ja rodando.' },
  { title: 'PROGRIDE A CARGA', body: 'Bateu o topo da faixa, o peso sobe na semana seguinte.' },
]

const QUOTES = [
  {
    text: '“Parei de levar caderninho pra academia. So o descanso rodando sozinho ja pagou o app.”',
    who: 'Rafael Nogueira, powerlifter',
  },
  {
    text: '“A cara do Doomguy virando pra falha e ridicula e funciona. Nunca fui tao consistente.”',
    who: 'Camila Sato, treinadora',
  },
]

function Reveal({ children, className = '', delay = 0 }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Face({ img, n, size = 44 }) {
  const h = Math.round(size * (31 / 24))
  return (
    <img
      src={`/doom-faces/${img}`}
      width={size}
      height={h}
      alt={`Doomguy no GER ${n}`}
      loading="lazy"
      style={{ width: size, height: h, imageRendering: 'pixelated', display: 'block' }}
    />
  )
}

export default function Landing() {
  const reduce = useReducedMotion()
  const tap = reduce ? undefined : { scale: 0.98 }

  return (
    <div className="lp-frame min-h-[100dvh] bg-bg text-ink font-body">
      {/* ── NAV ── uma linha, <= 64px, colapsa pra marca + CTA no mobile ── */}
      <header className="sticky top-0 z-50 border-b border-border1 bg-bg/95 backdrop-blur-[2px]">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="font-display text-2xl leading-none text-ink" style={{ textShadow: '0 0 18px rgba(255,20,20,0.35)' }}>
            OVERLOAD
          </a>
          <div className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a8a8a] sm:flex">
            <a href="#ger" className="transition-colors hover:text-ink">GER</a>
            <a href="#recursos" className="transition-colors hover:text-ink">Recursos</a>
            <a href="#como" className="transition-colors hover:text-ink">Como funciona</a>
          </div>
          <motion.a
            href="/"
            whileTap={tap}
            className="border border-neon px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-neon transition-colors hover:bg-neon hover:text-bg"
          >
            Abrir app
          </motion.a>
        </nav>
      </header>

      {/* ── HERO ── split assimetrico, alinhado a esquerda (anti-centro, VARIANCE 8) ── */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pt-20 pb-16 md:min-h-[calc(100dvh-4rem)] md:grid-cols-[1.05fr_0.95fr] md:pt-24">
        <div>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 font-mono text-[11px] uppercase tracking-[0.35em] text-neon"
          >
            Treino de hipertrofia
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-5xl leading-[0.92] text-ink sm:text-6xl md:text-7xl"
          >
            O peso certo
            <br />
            na barra.
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-[46ch] text-lg font-light leading-relaxed text-[#9a9a9a]"
          >
            Roda seu protocolo de hipertrofia, calcula a carga de cada serie e
            cronometra o descanso. Progressao semanal obrigatoria.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.19 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <motion.a
              href="/"
              whileTap={tap}
              className="group flex items-center gap-2 bg-neon px-7 py-3.5 font-mono text-sm uppercase tracking-[0.22em] text-bg"
              style={{ boxShadow: '0 0 32px rgba(255,20,20,0.25)' }}
            >
              Comecar
              <PiArrowRightBold className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </motion.a>
            <a
              href="#ger"
              className="border border-border2 px-7 py-3.5 font-mono text-sm uppercase tracking-[0.22em] text-[#9a9a9a] transition-colors hover:border-ink hover:text-ink"
            >
              Ver o GER
            </a>
          </motion.div>
        </div>

        {/* Painel HUD: preview real de UI (mini-versao das classes do app), nao mock de div. */}
        <Reveal delay={0.1}>
          <div className="lp-bracket border border-border2 bg-s1 p-5">
            <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-[#8a8a8a]">
              <span>Supino reto</span>
              <span className="text-neon">GER 11</span>
            </div>

            <div className="flex items-center gap-4 border border-border1 bg-s2 p-3">
              <Face img="ger11.png" n={11} size={52} />
              <div className="min-w-0">
                <div className="font-display text-base tracking-wide text-neon">GER 11 . PERTO DA FALHA</div>
                <div className="mt-1 font-mono text-[10px] leading-relaxed text-[#8a8a8a]">
                  deixa 1 a 2 reps na reserva. topo da rampa.
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {[
                { s: 1, kg: '60', reps: '10' },
                { s: 2, kg: '80', reps: '8' },
                { s: 3, kg: '92.5', reps: '6' },
              ].map((r) => (
                <div key={r.s} className="flex items-center gap-3 border border-border1 bg-s2 px-3 py-2 font-mono text-xs">
                  <span className="text-[#8a8a8a]">{r.s}</span>
                  <span className="text-ink">{r.kg} kg</span>
                  <span className="text-[#8a8a8a]">x {r.reps}</span>
                  <span className="ml-auto bg-neon-bg px-2 py-0.5 text-neon">{r.kg}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 border border-border1 bg-s2 px-3 py-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-neon">
                <span>Descansando</span>
                <span>1:12</span>
              </div>
              <div className="mt-2 h-[2px] w-full bg-border2">
                <div className="h-full bg-neon" style={{ width: '58%' }} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── RADAR ── componente Originkit (ascii-radar). Cores DOOM, 1 acento.
           Sem prop de pausa, entao com reduced-motion troca por um quadro estatico. ── */}
      <section className="border-t border-border1 bg-bg py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <div className="lp-bracket relative h-[300px] border border-border2 bg-bg md:h-[420px]">
              {reduce ? (
                <div className="flex h-full items-center justify-center">
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#8a8a8a]">
                    radar off / movimento reduzido
                  </span>
                </div>
              ) : (
                <AsciiRadar
                  background="#080808"
                  glyphColor="#FF1414"
                  ringColor="#FF1414"
                  density={45}
                  glyphSize={58}
                  speed={42}
                  ringSpeed={46}
                />
              )}
              <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.3em] text-neon">
                Radar / varredura
              </div>
              {!reduce && (
                <div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8a8a8a]">
                  toque pra pingar
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── ESCALA GER ── faixa horizontal, imagens reais (pixel art do proprio app) ── */}
      <section id="ger" className="border-t border-border1 bg-bg py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <h2 className="max-w-[20ch] font-body text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink md:text-5xl">
              GER: o quanto voce chega perto da falha
            </h2>
            <p className="mt-4 max-w-[54ch] text-base font-light leading-relaxed text-[#9a9a9a]">
              Cada serie carrega um Grau de Esforco Relativo, de 7 a 13. O app mostra a
              cara do Doomguy pro nivel e cobra a rampa ate ele.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <ul className="mt-10 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-7 md:gap-4 md:overflow-visible">
              {GER_SCALE.map((g) => (
                <li
                  key={g.n}
                  className="flex min-w-[104px] flex-1 snap-start flex-col items-center gap-3 border border-border1 bg-s1 p-4"
                >
                  <Face img={g.img} n={g.n} size={44} />
                  <div className="text-center">
                    <div className="font-mono text-[11px] tracking-[0.15em] text-neon">
                      GER {String(g.n).padStart(2, '0')}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#8a8a8a]">
                      {g.label}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── RECURSOS ── bento assimetrico, 4 celulas exatas, variacao visual real ── */}
      <section id="recursos" className="border-t border-border1 bg-bg py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-neon">O que o app faz</p>
            <h2 className="font-body text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink md:text-5xl">
              Ferramenta, nao planilha.
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={f.title} delay={i * 0.06} className={f.span}>
                  <div
                    className="flex h-full flex-col gap-4 border border-border1 p-6"
                    style={f.tint ? { background: 'rgba(255,20,20,0.05)', borderColor: 'rgba(255,20,20,0.22)' } : { background: '#0f0f0f' }}
                  >
                    <Icon size={26} className="text-neon" aria-hidden="true" />
                    <h3 className="font-body text-xl font-bold uppercase tracking-wide text-ink">{f.title}</h3>
                    <p className="max-w-[42ch] text-sm font-light leading-relaxed text-[#9a9a9a]">{f.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── pilha vertical com hairlines, rotulo = verbo-objeto ── */}
      <section id="como" className="border-t border-border1 bg-bg py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <Reveal>
            <h2 className="font-body text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink md:text-5xl">
              Tres passos, o resto e treino.
            </h2>
          </Reveal>
          <div className="mt-10">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <div className={`flex gap-5 py-6 ${i > 0 ? 'lp-hairline' : ''}`}>
                  <PiBarbellBold size={22} className="mt-1 shrink-0 text-neon" aria-hidden="true" />
                  <div>
                    <h3 className="font-body text-xl font-bold uppercase tracking-wide text-ink">{s.title}</h3>
                    <p className="mt-1.5 max-w-[52ch] text-sm font-light leading-relaxed text-[#9a9a9a]">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVA ── 2 depoimentos, <= 3 linhas, atribuicao com hifen ── */}
      <section className="border-t border-border1 bg-bg py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 md:grid-cols-2">
          {QUOTES.map((q, i) => (
            <Reveal key={q.who} delay={i * 0.06}>
              <figure className="flex h-full flex-col justify-between border border-border1 bg-s1 p-6">
                <blockquote className="text-lg font-light leading-snug text-ink">{q.text}</blockquote>
                <figcaption className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8a8a8a]">
                  {q.who}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── manifesto, uma intencao, mesmo rotulo do hero ── */}
      <section className="border-t border-border1 bg-bg py-20 text-center md:py-28">
        <div className="mx-auto max-w-2xl px-4">
          <Reveal>
            <h2 className="font-display text-5xl leading-[0.95] text-ink md:text-6xl" style={{ textShadow: '0 0 40px rgba(255,20,20,0.25)' }}>
              Sem desculpa hoje.
            </h2>
            <p className="mx-auto mt-5 max-w-[40ch] text-base font-light leading-relaxed text-[#9a9a9a]">
              Gratis. Abre no navegador, instala como app, treina offline.
            </p>
            <motion.a
              href="/"
              whileTap={tap}
              className="mt-8 inline-flex items-center gap-2 bg-neon px-9 py-4 font-mono text-sm uppercase tracking-[0.24em] text-bg"
              style={{ boxShadow: '0 0 32px rgba(255,20,20,0.25)' }}
            >
              Comecar
              <PiArrowRightBold aria-hidden="true" />
            </motion.a>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── minimo, sem versao, sem strip de local/hora ── */}
      <footer className="border-t border-border1 bg-bg py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center">
          <div className="font-display text-xl text-ink">OVERLOAD</div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a8a8a]">
            Feito pra quem treina pesado.
          </p>
          <div className="flex gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a8a8a]">
            <a href="/" className="transition-colors hover:text-ink">App</a>
            <a href="https://github.com/IgorOlive11/ultima-weapon" className="transition-colors hover:text-ink">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
