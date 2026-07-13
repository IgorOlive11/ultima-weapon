// Dicionário PT->EN pra busca na ExerciseDB (nomes/músculos/equipamentos são só em
// inglês na fonte). Não é tradução automática de conteúdo do exercício — é só um
// mapa de vocabulário de academia pra melhorar o achado da busca em português.
// Frases de múltiplas palavras vêm antes de palavras soltas (substituição greedy,
// da mais longa pra mais curta) pra não quebrar termos compostos.
const PHRASES = [
  ['levantamento terra', 'deadlift'],
  ['terra romeno', 'romanian deadlift'],
  ['supino reto', 'bench press'],
  ['supino inclinado', 'incline bench press'],
  ['supino declinado', 'decline bench press'],
  ['desenvolvimento militar', 'military press'],
  ['elevação lateral', 'lateral raise'],
  ['elevação frontal', 'front raise'],
  ['elevação de panturrilha', 'calf raise'],
  ['puxada alta', 'lat pulldown'],
  ['puxada frontal', 'lat pulldown'],
  ['puxada baixa', 'seated cable row'],
  ['remada baixa', 'seated cable row'],
  ['remada curvada', 'bent over row'],
  ['remada cavalinho', 't bar row'],
  ['cadeira extensora', 'leg extension'],
  ['cadeira flexora', 'leg curl'],
  ['mesa flexora', 'lying leg curl'],
  ['leg press', 'leg press'],
  ['agachamento livre', 'squat'],
  ['agachamento smith', 'smith machine squat'],
  ['agachamento búlgaro', 'bulgarian split squat'],
  ['afundo búlgaro', 'bulgarian split squat'],
  ['stiff romeno', 'romanian deadlift'],
  ['tríceps testa', 'skull crusher'],
  ['tríceps pulley', 'triceps pushdown'],
  ['tríceps corda', 'triceps rope pushdown'],
  ['rosca direta', 'biceps curl'],
  ['rosca martelo', 'hammer curl'],
  ['rosca scott', 'preacher curl'],
  ['rosca alternada', 'alternating dumbbell curl'],
  ['barra fixa', 'pull up'],
  ['barra fixa supinada', 'chin up'],
  ['flexão de braço', 'push up'],
  ['abdominal remador', 'sit up'],
  ['abdominal infra', 'leg raise'],
  ['abdominal supra', 'crunch'],
  ['encolhimento de ombros', 'shrug'],
  ['voador peitoral', 'chest fly'],
  ['crucifixo reto', 'chest fly'],
  ['crucifixo inclinado', 'incline chest fly'],
  ['face pull', 'face pull'],
  ['bom dia', 'good morning'],
  ['gato vaca', 'cat cow'],
]

const WORDS = {
  supino: 'bench press',
  agachamento: 'squat',
  rosca: 'curl',
  remada: 'row',
  puxada: 'pulldown',
  desenvolvimento: 'shoulder press',
  crucifixo: 'fly',
  voador: 'fly',
  mergulho: 'dip',
  prancha: 'plank',
  encolhimento: 'shrug',
  panturrilha: 'calf',
  panturrilhas: 'calves',
  abdominal: 'ab',
  abdominais: 'abs',
  abdomen: 'ab',
  tríceps: 'triceps',
  triceps: 'triceps',
  bíceps: 'biceps',
  biceps: 'biceps',
  peito: 'chest',
  peitoral: 'chest',
  costas: 'back',
  perna: 'leg',
  pernas: 'legs',
  ombro: 'shoulder',
  ombros: 'shoulders',
  glúteo: 'glute',
  gluteo: 'glute',
  glúteos: 'glutes',
  gluteos: 'glutes',
  quadríceps: 'quad',
  quadriceps: 'quad',
  posterior: 'hamstring',
  isquiotibiais: 'hamstring',
  isquios: 'hamstring',
  antebraço: 'forearm',
  antebraco: 'forearm',
  trapézio: 'trapezius',
  trapezio: 'trapezius',
  lombar: 'lower back',
  core: 'core',
  inclinado: 'incline',
  inclinada: 'incline',
  declinado: 'decline',
  declinada: 'decline',
  sentado: 'seated',
  sentada: 'seated',
  deitado: 'lying',
  deitada: 'lying',
  unilateral: 'single arm',
  halter: 'dumbbell',
  halteres: 'dumbbell',
  barra: 'barbell',
  polia: 'cable',
  cabo: 'cable',
  máquina: 'machine',
  maquina: 'machine',
  smith: 'smith machine',
  corda: 'rope',
}

// Ordena frases da mais longa pra mais curta (garante substituição greedy correta)
const SORTED_PHRASES = [...PHRASES].sort((a, b) => b[0].length - a[0].length)

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Traduz o que reconhece pro inglês da ExerciseDB; palavras desconhecidas ficam
// como estão (o ILIKE ainda tenta casar literalmente). Retorna também quais tokens
// foram efetivamente traduzidos — usado pelo auto-link pra medir confiança.
export function translateQueryToEnglish(text) {
  if (!text) return { query: '', translatedTokens: [] }
  let q = ' ' + stripAccents(text.toLowerCase().trim()) + ' '
  const translatedTokens = []

  for (const [pt, en] of SORTED_PHRASES) {
    const needle = ' ' + stripAccents(pt) + ' '
    if (q.includes(needle)) {
      q = q.split(needle).join(' ' + en + ' ')
      translatedTokens.push(en)
    }
  }

  q = q
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const plain = stripAccents(word)
      if (WORDS[plain]) {
        translatedTokens.push(WORDS[plain])
        return WORDS[plain]
      }
      return word
    })
    .join(' ')

  return { query: q.trim(), translatedTokens }
}

// Labels PT só pra exibição dos filtros — a query ao Supabase continua usando as
// chaves em inglês da ExerciseDB (contains em target_muscles/body_parts), então
// nenhum dado gravado precisa mudar.
export const BODY_PARTS_PT = {
  back: 'Costas',
  cardio: 'Cardio',
  chest: 'Peito',
  'lower arms': 'Antebraços',
  'lower legs': 'Pernas (inf.)',
  neck: 'Pescoço',
  shoulders: 'Ombros',
  'upper arms': 'Braços (sup.)',
  'upper legs': 'Pernas (sup.)',
  waist: 'Cintura/Abdômen',
}

export const MUSCLES_PT = {
  abdominals: 'Abdômen',
  abductors: 'Abdutores',
  abs: 'Abdômen',
  adductors: 'Adutores',
  'ankle stabilizers': 'Estabiliz. tornozelo',
  ankles: 'Tornozelos',
  back: 'Costas',
  biceps: 'Bíceps',
  brachialis: 'Braquial',
  calves: 'Panturrilhas',
  'cardiovascular system': 'Sist. cardiovascular',
  chest: 'Peito',
  core: 'Core',
  deltoids: 'Deltoides',
  delts: 'Deltoides',
  feet: 'Pés',
  forearms: 'Antebraços',
  glutes: 'Glúteos',
  'grip muscles': 'Músc. de preensão',
  groin: 'Virilha',
  hamstrings: 'Posteriores de coxa',
  hands: 'Mãos',
  'hip flexors': 'Flexores do quadril',
  'inner thighs': 'Coxa interna',
  'latissimus dorsi': 'Grande dorsal',
  lats: 'Dorsais',
  'levator scapulae': 'Levantador da escápula',
  'lower abs': 'Abdômen inferior',
  'lower back': 'Lombar',
  obliques: 'Oblíquos',
  pectorals: 'Peitorais',
  quadriceps: 'Quadríceps',
  quads: 'Quadríceps',
  'rear deltoids': 'Deltoide posterior',
  rhomboids: 'Romboides',
  'rotator cuff': 'Manguito rotador',
  'serratus anterior': 'Serrátil anterior',
  shins: 'Canelas',
  shoulders: 'Ombros',
  soleus: 'Sóleo',
  spine: 'Coluna',
  sternocleidomastoid: 'Esternocleidomastóideo',
  trapezius: 'Trapézio',
  traps: 'Trapézio',
  triceps: 'Tríceps',
  'upper back': 'Costas superior',
  'upper chest': 'Peito superior',
  'wrist extensors': 'Extensores do punho',
  'wrist flexors': 'Flexores do punho',
  wrists: 'Punhos',
}

export function bodyPartLabel(bp) {
  return BODY_PARTS_PT[bp] || bp
}

export function muscleLabel(m) {
  return MUSCLES_PT[m] || m
}
