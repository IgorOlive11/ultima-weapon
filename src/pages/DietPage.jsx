import { useState } from 'react'
import {
  LuSalad, LuApple, LuSunrise, LuMoon, LuBed, LuFish, LuLeaf,
  LuShield, LuSun, LuUtensilsCrossed, LuZap, LuFlame, LuDumbbell,
  LuStar, LuCircleCheck,
} from 'react-icons/lu'
import { useStore } from '../hooks/useStore'

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

  return [
    { ...MEAL_SUGGESTIONS.cafe,    time: fmtTimeMins(7 * 60 + 30) },
    { ...MEAL_SUGGESTIONS.lanche,  time: fmtTimeMins(lanche) },
    { ...MEAL_SUGGESTIONS.almoco,  time: fmtTimeMins(almoco) },
    isTrainingDay && { ...MEAL_SUGGESTIONS.pre,    time: fmtTimeMins(pre) },
    isTrainingDay && { ...MEAL_SUGGESTIONS.pos,    time: fmtTimeMins(pos) },
    { ...MEAL_SUGGESTIONS.jantar,  time: fmtTimeMins(jantar) },
    { ...MEAL_SUGGESTIONS.presono, time: fmtTimeMins(presono) },
  ].filter(Boolean)
}

// ─── micronutrients ───────────────────────────────────────────────────────────

const MICROS = [
  { id: 'vitD',   name: 'Vitamina D',   desc: 'Função muscular e imunidade',  source: 'Ovo (gema) + sardinha + sol',   Icon: LuSun },
  { id: 'omega3', name: 'Ômega-3',      desc: 'Anti-inflamatório pós-treino', source: 'Sardinha em lata 200g (3x/sem)', Icon: LuFish },
  { id: 'mag',    name: 'Magnésio',     desc: 'Relaxamento muscular + sono',  source: 'Aveia + feijão + amendoim',      Icon: LuLeaf },
  { id: 'zinc',   name: 'Zinco',        desc: 'Síntese proteica + imunidade', source: 'Carne moída + ovo',             Icon: LuShield },
  { id: 'iron',   name: 'Ferro',        desc: 'Transporte de O₂ + energia',   source: 'Carne moída + feijão + Vit C',  Icon: LuDumbbell },
  { id: 'b12',    name: 'Vitamina B12', desc: 'Energia + sistema nervoso',    source: 'Ovo + carne + leite',           Icon: LuZap },
  { id: 'sel',    name: 'Selênio',      desc: 'Antioxidante + recuperação',   source: '1 castanha do Pará/dia',        Icon: LuStar },
]

// ─── Macros section ───────────────────────────────────────────────────────────

function MacroTarget({ label, value, unit, color, detail }) {
  return (
    <div className="bg-s2 border border-border1 px-3 py-3 text-center">
      <div className="font-mono text-[9px] text-muted tracking-widest mb-1">{label}</div>
      <div className="font-display text-2xl tracking-wider" style={{ color }}>{value}</div>
      <div className="font-mono text-[9px] text-muted tracking-wider">{unit}</div>
      {detail && <div className="font-mono text-[9px] text-muted/60 mt-1">{detail}</div>}
    </div>
  )
}

function SectionMacros({ userProfile }) {
  const t = calcTargets(userProfile)
  const goalLabel = { bulk: 'GANHO DE MASSA', maintain: 'MANUTENÇÃO', cut: 'DEFINIÇÃO' }[userProfile.caloricGoal] || ''

  return (
    <div className="p-3 pb-8 space-y-3">
      {/* Header */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-1">{goalLabel}</div>
        <div className="font-mono text-[10px] text-muted mb-4">
          TDEE estimado: {t.tdee} kcal/dia · Meta: {t.kcal} kcal/dia
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MacroTarget label="CALORIAS"  value={t.kcal}    unit="kcal/dia"  color="#ffaa00" detail="Inclui excedente/deficit"/>
          <MacroTarget label="PROTEÍNA"  value={`${t.protein}g`} unit="2g/kg" color="#39FF14" detail={`${userProfile.weight}kg × 2`}/>
          <MacroTarget label="CARBOIDRATO" value={`${t.carbs}g`}  unit="g/dia" color="#00aaff" detail="Restante calórico"/>
          <MacroTarget label="GORDURA"   value={`${t.fat}g`}    unit="1g/kg" color="#ff6600" detail={`${userProfile.weight}kg × 1`}/>
        </div>
      </div>

      {/* Distribution */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3">DISTRIBUIÇÃO CALÓRICA</div>
        {[
          { label: 'PROTEÍNA',    kcal: t.protein * 4, pct: Math.round((t.protein * 4 / t.kcal) * 100), color: '#39FF14' },
          { label: 'CARBOIDRATO', kcal: t.carbs * 4,   pct: Math.round((t.carbs * 4 / t.kcal) * 100),   color: '#00aaff' },
          { label: 'GORDURA',     kcal: t.fat * 9,     pct: Math.round((t.fat * 9 / t.kcal) * 100),     color: '#ff6600' },
        ].map(({ label, kcal, pct, color }) => (
          <div key={label} className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-muted tracking-wider">{label}</span>
              <span className="font-mono text-[10px]" style={{ color }}>{kcal} kcal ({pct}%)</span>
            </div>
            <div className="h-[3px] bg-border1">
              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="bg-s2 border border-border2 border-l-[3px] border-l-neon px-3 py-3">
        <div className="font-mono text-[10px] text-muted leading-relaxed">
          Ajuste seu perfil em <span className="text-neon">Configurações</span> para recalcular os valores conforme seu objetivo atual.
        </div>
      </div>
    </div>
  )
}

// ─── Plano section ────────────────────────────────────────────────────────────

function SectionPlano({ userProfile, currentWeek, currentDay }) {
  const dateKey      = today()
  const toggleMeal   = useStore(s => s.toggleMeal)
  const mealLog      = useStore(s => s.mealLog)
  const userProtocol = useStore(s => s.userProtocol)

  const day = userProtocol.weeks[currentWeek]?.days[currentDay]
  const isTrainingDay = !day?.isRest && (day?.exercises?.length || 0) > 0

  const meals   = buildMealSchedule(userProfile.workoutTime, userProfile.sleepTime, isTrainingDay)
  const marked  = mealLog[dateKey] || {}

  return (
    <div className="p-3 pb-8 space-y-2">
      {!isTrainingDay && (
        <div className="bg-s2 border border-border1 px-3 py-2 font-mono text-[10px] text-muted tracking-widest text-center">
          DIA DE DESCANSO — pré/pós-treino ocultados
        </div>
      )}
      {meals.map(meal => {
        const done = !!marked[meal.id]
        const { Icon } = meal
        return (
          <div
            key={meal.id}
            className="bg-s1 border border-border1 p-3"
            style={done ? { borderLeftWidth: 3, borderLeftColor: '#39FF14' } : {}}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-muted flex-shrink-0"/>
              <span className="font-mono text-[10px] text-muted tracking-widest">{meal.time}</span>
              <span className="font-body font-bold text-sm text-ink flex-1">{meal.name}</span>
              {done && <LuCircleCheck size={14} className="text-neon flex-shrink-0"/>}
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
                onClick={() => toggleMeal(dateKey, meal.id)}
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

// ─── Micros section ───────────────────────────────────────────────────────────

function SectionMicros({ microLog }) {
  const dateKey    = today()
  const toggleMicro = useStore(s => s.toggleMicro)
  const checked    = microLog[dateKey] || {}
  const doneCount  = MICROS.filter(m => checked[m.id]).length

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
                  <Icon size={14} style={{ color: done ? '#39FF14' : '#555' }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body font-bold text-sm" style={{ color: done ? '#39FF14' : '#e8e8e8' }}>
                    {name}
                  </div>
                  <div className="font-mono text-[9px] text-muted truncate">{source}</div>
                </div>
                <div
                  className="w-5 h-5 flex-shrink-0 border flex items-center justify-center transition-all"
                  style={done ? { background: '#39FF14', borderColor: '#39FF14' } : { borderColor: '#444' }}
                >
                  {done && <LuCircleCheck size={12} className="text-bg"/>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── DietPage ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'macros', label: 'MACROS' },
  { id: 'plano',  label: 'PLANO'  },
  { id: 'micros', label: 'MICROS' },
]

export default function DietPage() {
  const [tab, setTab]   = useState('macros')
  const userProfile     = useStore(s => s.userProfile)
  const microLog        = useStore(s => s.microLog)
  const currentWeek     = useStore(s => s.currentWeek)
  const currentDay      = useStore(s => s.currentDay)

  return (
    <div className="flex flex-col h-full">
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {tab === 'macros' && <SectionMacros userProfile={userProfile}/>}
        {tab === 'plano'  && <SectionPlano  userProfile={userProfile} currentWeek={currentWeek} currentDay={currentDay}/>}
        {tab === 'micros' && <SectionMicros microLog={microLog}/>}
      </div>
    </div>
  )
}
