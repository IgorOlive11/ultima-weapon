import { useState } from 'react'
import {
  LuSalad, LuApple, LuSunrise, LuMoon, LuBed, LuFish, LuLeaf,
  LuShield, LuSun, LuUtensilsCrossed, LuZap, LuFlame, LuDumbbell,
  LuStar, LuSearch, LuX, LuPlus, LuCircleCheck, LuTrash2,
} from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { PROTOCOL, JS_DAY_TO_IDX } from '../data/protocol'

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseTimeMins(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  return h * 60 + m
}

function fmtTimeMins(mins) {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const m = ((mins % 1440) + 1440) % 1440 % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function calcTargets(profile) {
  const { weight, height, age, sex, activityLevel, caloricGoal } = profile
  const bmr    = 10 * weight + 6.25 * height - 5 * age + (sex === 'M' ? 5 : -161)
  const tdee   = Math.round(bmr * activityLevel)
  const surplus = { bulk: 350, maintain: 0, cut: -400 }[caloricGoal] ?? 0
  const kcal   = tdee + surplus
  const protein = Math.round(2.0 * weight)
  const fat     = Math.round(1.0 * weight)
  const carbs   = Math.round((kcal - protein * 4 - fat * 9) / 4)
  return { kcal, protein, fat, carbs, tdee }
}

// ─── meal plan data ───────────────────────────────────────────────────────────

const MEAL_SUGGESTIONS = {
  cafe: {
    id: 'cafe', name: 'Café da manhã', Icon: LuSunrise,
    foods: ['4 ovos mexidos', 'Aveia 80g', 'Leite integral 300ml', 'Banana 1 média'],
    macros: { kcal: 860, p: 44, c: 91, g: 36 },
  },
  lanche: {
    id: 'lanche', name: 'Lanche manhã', Icon: LuApple,
    foods: ['Pão francês 2un', 'Atum em lata 120g', '1 castanha do Pará'],
    macros: { kcal: 315, p: 36, c: 29, g: 6 },
  },
  almoco: {
    id: 'almoco', name: 'Almoço', Icon: LuUtensilsCrossed,
    foods: ['Arroz 200g', 'Feijão 100g', 'Carne moída 150g', 'Cenoura refogada 100g'],
    macros: { kcal: 787, p: 48, c: 92, g: 24 },
  },
  pre: {
    id: 'pre', name: 'Pré-treino', Icon: LuZap,
    foods: ['Batata doce 200g', 'Frango grelhado 120g'],
    macros: { kcal: 370, p: 40, c: 40, g: 5 },
    trainingOnly: true,
  },
  pos: {
    id: 'pos', name: 'Pós-treino', Icon: LuFlame,
    foods: ['Whey protein 40g', 'Banana 2 médias'],
    macros: { kcal: 340, p: 34, c: 52, g: 2 },
    trainingOnly: true,
  },
  jantar: {
    id: 'jantar', name: 'Jantar', Icon: LuMoon,
    foods: ['Macarrão 150g', 'Sardinha em lata 200g', 'Tomate + alho refogado'],
    macros: { kcal: 609, p: 49, c: 53, g: 23 },
  },
  presono: {
    id: 'presono', name: 'Pré-sono', Icon: LuBed,
    foods: ['Leite integral morno 400ml', 'Pasta de amendoim 20g'],
    macros: { kcal: 364, p: 18, c: 23, g: 23 },
  },
}

function buildMealSchedule(workoutTime, sleepTime, isTrainingDay) {
  const wt    = parseTimeMins(workoutTime)
  const sleep = parseTimeMins(sleepTime)

  const lanche  = wt - 300
  const almoco  = Math.max(wt - 210, 13 * 60)
  const pre     = wt - 105
  const pos     = wt + 60
  const jantar  = wt + 150
  const presono = sleep - 30

  const slots = [
    { ...MEAL_SUGGESTIONS.cafe,    time: fmtTimeMins(7 * 60 + 30) },
    { ...MEAL_SUGGESTIONS.lanche,  time: fmtTimeMins(lanche) },
    { ...MEAL_SUGGESTIONS.almoco,  time: fmtTimeMins(almoco) },
    isTrainingDay && { ...MEAL_SUGGESTIONS.pre,    time: fmtTimeMins(pre) },
    isTrainingDay && { ...MEAL_SUGGESTIONS.pos,    time: fmtTimeMins(pos) },
    { ...MEAL_SUGGESTIONS.jantar,  time: fmtTimeMins(jantar) },
    { ...MEAL_SUGGESTIONS.presono, time: fmtTimeMins(presono) },
  ].filter(Boolean)

  return slots
}

// ─── micronutrients ───────────────────────────────────────────────────────────

const MICROS = [
  { id: 'vitD',   name: 'Vitamina D',   desc: 'Função muscular e imunidade',  source: 'Ovo (gema) + sardinha + sol',        Icon: LuSun },
  { id: 'omega3', name: 'Ômega-3',      desc: 'Anti-inflamatório pós-treino', source: 'Sardinha em lata 200g (3x/sem)',      Icon: LuFish },
  { id: 'mag',    name: 'Magnésio',     desc: 'Relaxamento muscular + sono',  source: 'Aveia + feijão + amendoim',          Icon: LuLeaf },
  { id: 'zinc',   name: 'Zinco',        desc: 'Síntese proteica + imunidade', source: 'Carne moída + ovo',                  Icon: LuShield },
  { id: 'iron',   name: 'Ferro',        desc: 'Transporte de O₂ + energia',   source: 'Carne moída + feijão + Vit C',       Icon: LuDumbbell },
  { id: 'b12',    name: 'Vitamina B12', desc: 'Energia + sistema nervoso',    source: 'Ovo + carne + leite',                Icon: LuZap },
  { id: 'sel',    name: 'Selênio',      desc: 'Antioxidante + recuperação',   source: '1 castanha do Pará/dia',             Icon: LuStar },
]

// ─── sub-components ───────────────────────────────────────────────────────────

function MacroBar({ label, current, target, color }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-mono text-[10px] text-muted tracking-widest">{label}</span>
        <span className="font-mono text-[11px]" style={{ color }}>
          {Math.round(current)} <span className="text-muted">/ {target}</span>
        </span>
      </div>
      <div className="h-[3px] bg-border1 w-full">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function SectionMacros({ foodLog, userProfile }) {
  const dateKey = today()
  const entries = foodLog[dateKey] || []
  const targets = calcTargets(userProfile)

  const totals = entries.reduce(
    (acc, e) => ({
      kcal:    acc.kcal    + (e.kcal    || 0),
      protein: acc.protein + (e.protein || 0),
      carbs:   acc.carbs   + (e.carbs   || 0),
      fat:     acc.fat     + (e.fat     || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const removeFoodEntry = useStore(s => s.removeFoodEntry)

  return (
    <div className="p-3 pb-8 space-y-3">
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-4 pb-2 border-b border-border1">
          METAS DE HOJE
        </div>
        <MacroBar label="CALORIAS"  current={totals.kcal}    target={targets.kcal}    color="#ffaa00" />
        <MacroBar label="PROTEÍNA"  current={totals.protein} target={targets.protein} color="#39FF14" />
        <MacroBar label="CARBOIDRATO" current={totals.carbs} target={targets.carbs}   color="#00aaff" />
        <MacroBar label="GORDURA"   current={totals.fat}     target={targets.fat}     color="#ff6600" />
        <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-border1">
          {[
            { label: 'KCAL',     val: Math.round(totals.kcal),    color: '#ffaa00' },
            { label: 'PTN',      val: `${Math.round(totals.protein)}g`, color: '#39FF14' },
            { label: 'CARBO',    val: `${Math.round(totals.carbs)}g`,   color: '#00aaff' },
            { label: 'GORD',     val: `${Math.round(totals.fat)}g`,     color: '#ff6600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div className="font-display text-base tracking-wide" style={{ color }}>{val}</div>
              <div className="font-mono text-[8px] text-muted tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="bg-s1 border border-border1 p-4">
          <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
            REGISTRADO HOJE
          </div>
          <div className="space-y-1.5">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1 border-b border-border1/40 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-body font-semibold text-xs text-ink truncate">{e.name}</div>
                  <div className="font-mono text-[9px] text-muted">
                    {e.grams}g · {Math.round(e.kcal)}kcal · P{Math.round(e.protein)}g
                  </div>
                </div>
                <button
                  onClick={() => removeFoodEntry(dateKey, e.id)}
                  className="text-muted hover:text-danger transition-colors flex-shrink-0 p-1"
                >
                  <LuTrash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionPlano({ userProfile, currentWeek, currentDay, foodLog }) {
  const dateKey = today()
  const dayData = PROTOCOL[currentWeek]?.days[currentDay]
  const isTrainingDay = !dayData?.rest

  const addFoodEntry = useStore(s => s.addFoodEntry)

  const meals = buildMealSchedule(userProfile.workoutTime, userProfile.sleepTime, isTrainingDay)

  const markedIds = new Set((foodLog[dateKey] || []).map(e => e.source))

  const markMeal = (meal) => {
    if (markedIds.has(meal.id)) return
    addFoodEntry(dateKey, {
      name:    meal.name,
      grams:   0,
      kcal:    meal.macros.kcal,
      protein: meal.macros.p,
      carbs:   meal.macros.c,
      fat:     meal.macros.g,
      source:  meal.id,
    })
  }

  return (
    <div className="p-3 pb-8 space-y-2">
      {!isTrainingDay && (
        <div className="bg-s2 border border-border1 px-3 py-2 font-mono text-[10px] text-muted tracking-widest text-center">
          DIA DE DESCANSO — pré/pós-treino ocultados
        </div>
      )}
      {meals.map(meal => {
        const done = markedIds.has(meal.id)
        const { Icon } = meal
        return (
          <div
            key={meal.id}
            className="bg-s1 border border-border1 p-3"
            style={done ? { borderLeftWidth: 3, borderLeftColor: '#39FF14' } : {}}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-muted flex-shrink-0" />
              <span className="font-mono text-[10px] text-muted tracking-widest">{meal.time}</span>
              <span className="font-body font-bold text-sm text-ink flex-1">{meal.name}</span>
              {done && <LuCircleCheck size={14} className="text-neon flex-shrink-0" />}
            </div>
            <div className="font-mono text-[10px] text-muted2 leading-relaxed mb-2">
              {meal.foods.join(' · ')}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-3 font-mono text-[10px]">
                <span className="text-[#ffaa00]">{meal.macros.kcal}kcal</span>
                <span className="text-[#39FF14]">P{meal.macros.p}g</span>
                <span className="text-[#00aaff]">C{meal.macros.c}g</span>
                <span className="text-[#ff6600]">G{meal.macros.g}g</span>
              </div>
              <button
                disabled={done}
                onClick={() => markMeal(meal)}
                className="font-display text-[10px] tracking-widest border px-2.5 py-1 transition-all active:opacity-80"
                style={done
                  ? { borderColor: '#39FF1433', color: '#39FF14', background: '#39FF1408' }
                  : { borderColor: '#39FF1455', color: '#39FF14', background: '#39FF140d' }}
              >
                {done ? 'FEITA ✓' : 'MARCAR'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SectionMicros({ microLog }) {
  const dateKey = today()
  const toggleMicro = useStore(s => s.toggleMicro)
  const checked = microLog[dateKey] || {}
  const doneCount = MICROS.filter(m => checked[m.id]).length

  return (
    <div className="p-3 pb-8">
      <div className="bg-s1 border border-border1 p-4 mb-3">
        <div className="flex items-center justify-between pb-2 border-b border-border1 mb-3">
          <div className="font-display text-sm text-neon tracking-[0.2em]">MICRONUTRIENTES</div>
          <div className="font-mono text-[10px] text-muted">{doneCount}/{MICROS.length} HOJE</div>
        </div>
        <div className="h-[2px] bg-border1 mb-4">
          <div
            className="h-full transition-all duration-500 bg-neon"
            style={{ width: `${(doneCount / MICROS.length) * 100}%` }}
          />
        </div>
        <div className="space-y-2">
          {MICROS.map(({ id, name, desc, source, Icon }) => {
            const done = !!checked[id]
            return (
              <div
                key={id}
                className="flex items-center gap-3 py-2 border-b border-border1/40 last:border-0 cursor-pointer"
                onClick={() => toggleMicro(dateKey, id)}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center flex-shrink-0 border transition-all"
                  style={done
                    ? { background: '#39FF1422', borderColor: '#39FF14' }
                    : { background: 'transparent', borderColor: '#333' }}
                >
                  <Icon size={14} style={{ color: done ? '#39FF14' : '#555' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body font-bold text-sm" style={{ color: done ? '#39FF14' : '#e8e8e8' }}>
                    {name}
                  </div>
                  <div className="font-mono text-[9px] text-muted truncate">{source}</div>
                </div>
                <div
                  className="w-5 h-5 flex-shrink-0 border flex items-center justify-center transition-all"
                  style={done
                    ? { background: '#39FF14', borderColor: '#39FF14' }
                    : { borderColor: '#444' }}
                >
                  {done && <LuCircleCheck size={12} className="text-bg" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionBuscar() {
  const dateKey = today()
  const addFoodEntry = useStore(s => s.addFoodEntry)

  const [query, setQuery]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState([])
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams]       = useState('')
  const [added, setAdded]       = useState(false)

  const search = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResults([])
    setSelected(null)
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&country_tags=brazil&page_size=10`
      const res  = await fetch(url)
      if (!res.ok) throw new Error('Erro na rede')
      const data = await res.json()
      const products = (data.products || [])
        .filter(p => p.product_name)
        .map(p => ({
          name:    p.product_name,
          kcal:    p.nutriments?.['energy-kcal_100g'] ?? null,
          protein: p.nutriments?.proteins_100g        ?? null,
          carbs:   p.nutriments?.carbohydrates_100g   ?? null,
          fat:     p.nutriments?.fat_100g             ?? null,
        }))
        .filter(p => p.kcal !== null)
      setResults(products)
      if (products.length === 0) setError('Nenhum resultado encontrado.')
    } catch {
      setError('Erro ao buscar. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (!selected || !grams || Number(grams) <= 0) return
    const f = Number(grams) / 100
    addFoodEntry(dateKey, {
      name:    selected.name,
      grams:   Number(grams),
      kcal:    Math.round((selected.kcal    || 0) * f),
      protein: Math.round((selected.protein || 0) * f * 10) / 10,
      carbs:   Math.round((selected.carbs   || 0) * f * 10) / 10,
      fat:     Math.round((selected.fat     || 0) * f * 10) / 10,
      source:  'search',
    })
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      setSelected(null)
      setGrams('')
      setResults([])
      setQuery('')
    }, 1500)
  }

  return (
    <div className="p-3 pb-8">
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 bg-s2 border border-border2 text-ink px-3 py-2.5 font-body text-sm tracking-wide outline-none focus:border-neon transition-colors"
          type="text" placeholder="Buscar alimento..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button
          onClick={search}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-neon text-bg font-display text-[12px] tracking-widest transition-all active:opacity-80 disabled:opacity-50"
        >
          <LuSearch size={14} />
          {loading ? '...' : 'IR'}
        </button>
      </div>

      {error && (
        <div className="font-mono text-[11px] text-muted text-center py-4">{error}</div>
      )}

      {/* Selected product — gram input */}
      {selected && (
        <div className="bg-s1 border border-neon/30 p-3 mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="font-body font-bold text-sm text-ink leading-tight flex-1">{selected.name}</div>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-ink flex-shrink-0">
              <LuX size={14} />
            </button>
          </div>
          <div className="font-mono text-[10px] text-muted mb-3">
            por 100g · {Math.round(selected.kcal)}kcal · P{Math.round(selected.protein)}g · C{Math.round(selected.carbs)}g · G{Math.round(selected.fat)}g
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="font-mono text-[9px] text-muted tracking-widest mb-1">GRAMAS</div>
              <div className="flex items-center gap-1.5">
                <input
                  className="input-base flex-1 text-center"
                  type="number" inputMode="decimal" min="1" placeholder="100"
                  value={grams} onChange={e => setGrams(e.target.value)}
                />
                <span className="font-mono text-[10px] text-muted">g</span>
              </div>
            </div>
            {grams && Number(grams) > 0 && (
              <div className="flex-1 bg-s2 border border-border1 px-2 py-1.5 font-mono text-[10px]">
                <div className="text-[#ffaa00]">{Math.round((selected.kcal || 0) * Number(grams) / 100)}kcal</div>
                <div className="text-[#39FF14]">P{Math.round((selected.protein || 0) * Number(grams) / 100 * 10) / 10}g</div>
                <div className="text-[#00aaff]">C{Math.round((selected.carbs   || 0) * Number(grams) / 100 * 10) / 10}g</div>
              </div>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!grams || Number(grams) <= 0}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 font-display text-[13px] tracking-widest border transition-all active:opacity-80 disabled:opacity-40"
            style={added
              ? { background: '#39FF14', color: '#080808', borderColor: '#39FF14' }
              : { borderColor: '#39FF1455', background: '#39FF140d', color: '#39FF14' }}
          >
            {added ? <><LuCircleCheck size={14} />ADICIONADO!</> : <><LuPlus size={14} />ADICIONAR AO LOG</>}
          </button>
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && !selected && (
        <div className="space-y-1.5">
          {results.map((p, i) => (
            <button
              key={i}
              onClick={() => { setSelected(p); setGrams('') }}
              className="w-full bg-s1 border border-border1 p-3 text-left hover:border-neon/40 transition-colors active:opacity-80"
            >
              <div className="font-body font-semibold text-sm text-ink leading-tight mb-1 line-clamp-2">{p.name}</div>
              <div className="font-mono text-[10px] text-muted">
                {Math.round(p.kcal)}kcal · P{Math.round(p.protein)}g · C{Math.round(p.carbs)}g · G{Math.round(p.fat)}g <span className="text-muted/60">por 100g</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'macros', label: 'MACROS' },
  { id: 'plano',  label: 'PLANO'  },
  { id: 'micros', label: 'MICROS' },
  { id: 'buscar', label: 'BUSCAR' },
]

export default function DietPage() {
  const [tab, setTab] = useState('macros')

  const userProfile  = useStore(s => s.userProfile)
  const foodLog      = useStore(s => s.foodLog)
  const microLog     = useStore(s => s.microLog)
  const currentWeek  = useStore(s => s.currentWeek)
  const currentDay   = useStore(s => s.currentDay)

  return (
    <div className="flex flex-col h-full">
      {/* Tab row */}
      <div className="flex border-b border-border1 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 font-display text-[11px] tracking-widest transition-all border-b-2"
            style={tab === t.id
              ? { color: '#39FF14', borderBottomColor: '#39FF14' }
              : { color: '#555', borderBottomColor: 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {tab === 'macros' && <SectionMacros foodLog={foodLog} userProfile={userProfile} />}
        {tab === 'plano'  && <SectionPlano  userProfile={userProfile} currentWeek={currentWeek} currentDay={currentDay} foodLog={foodLog} />}
        {tab === 'micros' && <SectionMicros microLog={microLog} />}
        {tab === 'buscar' && <SectionBuscar />}
      </div>
    </div>
  )
}
