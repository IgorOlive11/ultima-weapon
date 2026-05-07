import { defaultUserProtocol } from '../data/protocol'

const HEADERS = [
  'semana', 'dia', 'descanso_seg', 'aquecimento_seg', 'feeder_seg',
  'dia_descanso', 'exercicio', 'musculo', 'tipo_serie', 'ger', 'rep_range',
  'musculo_acessorio',
]

// ─── Template ──────────────────────────────────────────────────────────────────
// Tipos válidos: NORMAL | REST_PAUSE | MUSCLE_ROUND | WIDOWMAKER | PULSE
// dia_descanso: S = dia de descanso (demais colunas ignoradas) | N = treino
// Uma linha por série — mesmo exercício/dia com múltiplas linhas = múltiplas séries

const EXAMPLE_ROWS = [
  // SEG: Peito
  [1,1,120,60,60,'N','Supino Reto',    'PEITO',  'NORMAL',     10,'8-12',''],
  [1,1,120,60,60,'N','Supino Reto',    'PEITO',  'NORMAL',     10,'8-12',''],
  [1,1,120,60,60,'N','Supino Reto',    'PEITO',  'NORMAL',     10,'8-12',''],
  [1,1,120,60,60,'N','Crucifixo',      'PEITO',  'REST_PAUSE', 12,'',   ''],
  // TER: Costas
  [1,2,120,60,60,'N','Puxada Frontal', 'COSTAS', 'NORMAL',     10,'8-12',''],
  [1,2,120,60,60,'N','Puxada Frontal', 'COSTAS', 'NORMAL',     10,'8-12',''],
  [1,2,120,60,60,'N','Remada Curvada', 'COSTAS', 'NORMAL',     10,'8-12',''],
  [1,2,120,60,60,'N','Remada Curvada', 'COSTAS', 'NORMAL',     10,'8-12',''],
  // QUA: Descanso
  [1,3,'','','','S','','','','','',''],
  // QUI: Ombros
  [1,4,120,60,60,'N','Desenvolvimento','OMBROS', 'NORMAL',     10,'8-12',''],
  [1,4,120,60,60,'N','Desenvolvimento','OMBROS', 'NORMAL',     10,'8-12',''],
  [1,4,120,60,60,'N','Elevação Lateral','OMBROS','MUSCLE_ROUND',11,'',   ''],
  // SEX: Pernas
  [1,5,180,60,90,'N','Agachamento',   'QUADRÍCEPS','NORMAL',   10,'8-12',''],
  [1,5,180,60,90,'N','Agachamento',   'QUADRÍCEPS','NORMAL',   10,'8-12',''],
  [1,5,180,60,90,'N','Leg Press',     'QUADRÍCEPS','WIDOWMAKER',13,'10-12',''],
  // SAB: Braços
  [1,6,90,60,60,'N','Rosca Direta',   'BÍCEPS',  'NORMAL',     10,'8-12',''],
  [1,6,90,60,60,'N','Rosca Direta',   'BÍCEPS',  'NORMAL',     10,'8-12',''],
  [1,6,90,60,60,'N','Tríceps Pulley', 'TRÍCEPS', 'REST_PAUSE', 12,'',   ''],
  // DOM: Descanso
  [1,7,'','','','S','','','','','',''],
]

export function generateTemplateCsv() {
  const lines = [HEADERS.join(',')]
  for (const row of EXAMPLE_ROWS) lines.push(row.join(','))
  return lines.join('\n')
}

export function downloadTemplateCsv() {
  const csv = generateTemplateCsv()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'protocolo_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Exporter ─────────────────────────────────────────────────────────────────

export function exportProtocolCsv(protocol) {
  const lines = [HEADERS.join(',')]

  protocol.weeks.forEach((week, wIdx) => {
    week.days.forEach((day, dIdx) => {
      const semana = wIdx + 1
      const dia    = dIdx + 1

      if (day.isRest) {
        lines.push([semana, dia, '', '', '', 'S', '', '', '', '', '', ''].join(','))
        return
      }

      if (day.exercises.length === 0) {
        const ds = day.restSeconds        ?? 120
        const as = day.warmupRestSeconds  ?? 60
        const fs = day.feederRestSeconds  ?? 60
        lines.push([semana, dia, ds, as, fs, 'N', '', '', '', '', '', ''].join(','))
        return
      }

      day.exercises.forEach(ex => {
        const ds = day.restSeconds        ?? 120
        const as = day.warmupRestSeconds  ?? 60
        const fs = day.feederRestSeconds  ?? 60

        if (ex.sets.length === 0) {
          lines.push([semana, dia, ds, as, fs, 'N', ex.name, ex.muscle, '', '', '', ex.accessoryMuscle ?? ''].join(','))
          return
        }

        ex.sets.forEach(set => {
          lines.push([
            semana, dia, ds, as, fs, 'N',
            ex.name, ex.muscle, set.type, set.ger, set.repRange ?? '', ex.accessoryMuscle ?? '',
          ].join(','))
        })
      })
    })
  })

  return lines.join('\n')
}

export function downloadProtocolCsv(protocol) {
  const csv  = exportProtocolCsv(protocol)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'protocolo_overload.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Parser ────────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function parseProtocolCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV vazio ou inválido')

  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase())
  const col = (name) => rawHeaders.indexOf(name)

  const missingCols = ['semana', 'dia', 'exercicio'].filter(h => col(h) < 0)
  if (missingCols.length) {
    throw new Error(`Colunas obrigatórias ausentes: ${missingCols.join(', ')}. Use o template.`)
  }

  const protocol = defaultUserProtocol()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cells = line.split(',')
    const get = (name) => (cells[col(name)] ?? '').trim()

    const semana = parseInt(get('semana'))
    const dia    = parseInt(get('dia'))
    if (isNaN(semana) || semana < 1 || semana > 8) continue
    if (isNaN(dia)    || dia < 1    || dia > 7)    continue

    const wIdx = semana - 1
    const dIdx = dia - 1
    const day  = protocol.weeks[wIdx].days[dIdx]

    const dseg  = parseInt(get('descanso_seg'))
    const aseg  = parseInt(get('aquecimento_seg'))
    const fseg  = parseInt(get('feeder_seg'))
    if (!isNaN(dseg) && dseg > 0) day.restSeconds        = dseg
    if (!isNaN(aseg) && aseg > 0) day.warmupRestSeconds  = aseg
    if (!isNaN(fseg) && fseg > 0) day.feederRestSeconds  = fseg

    if (get('dia_descanso').toUpperCase() === 'S') {
      day.isRest = true
      continue
    }

    const exercicio = get('exercicio')
    if (!exercicio) continue

    const musculo        = get('musculo')  || 'OUTRO'
    const tipoSerie      = get('tipo_serie').toUpperCase() || 'NORMAL'
    const ger            = parseInt(get('ger')) || 10
    const repRange       = get('rep_range') || ''
    const accessoryMuscle = get('musculo_acessorio') || ''

    const VALID_TYPES = ['NORMAL','REST_PAUSE','MUSCLE_ROUND','WIDOWMAKER','PULSE']
    const tipo = VALID_TYPES.includes(tipoSerie) ? tipoSerie : 'NORMAL'

    let ex = day.exercises.find(e => e.name.toLowerCase() === exercicio.toLowerCase())
    if (!ex) {
      ex = { id: genId(), name: exercicio, muscle: musculo, sets: [], ...(accessoryMuscle ? { accessoryMuscle } : {}) }
      day.exercises.push(ex)
    }

    ex.sets.push({ id: genId(), type: tipo, ger, repRange })
  }

  return protocol
}
