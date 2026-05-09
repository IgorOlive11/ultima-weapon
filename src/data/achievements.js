// Each achievement: { id, title, desc, face, check(stats) → bool }
// stats: { workoutCount, streak, lastWorkoutAllAbove }

export const ACHIEVEMENTS = [
  {
    id:    'first_workout',
    title: 'PRIMEIRA MISSÃO',
    desc:  'Completou o primeiro treino.',
    face:  'ger9',
    check: ({ workoutCount }) => workoutCount >= 1,
  },
  {
    id:    'workout_5',
    title: 'HABITUÉ',
    desc:  '5 treinos completados.',
    face:  'ger10',
    check: ({ workoutCount }) => workoutCount >= 5,
  },
  {
    id:    'workout_10',
    title: 'VETERANO',
    desc:  '10 treinos completados.',
    face:  'ger11',
    check: ({ workoutCount }) => workoutCount >= 10,
  },
  {
    id:    'workout_30',
    title: 'DOOM SLAYER',
    desc:  '30 treinos completados.',
    face:  'ger13',
    check: ({ workoutCount }) => workoutCount >= 30,
  },
  {
    id:    'streak_3',
    title: 'SEM DESCULPA',
    desc:  '3 dias consecutivos treinando.',
    face:  'ger10',
    check: ({ streak }) => streak >= 3,
  },
  {
    id:    'streak_7',
    title: 'HELLWALKER',
    desc:  '7 dias consecutivos treinando.',
    face:  'ger12',
    check: ({ streak }) => streak >= 7,
  },
  {
    id:    'rip_and_tear',
    title: 'RIP AND TEAR',
    desc:  'Superou o rep range em todos os exercícios de um treino.',
    face:  'ger13',
    check: ({ lastWorkoutAllAbove }) => lastWorkoutAllAbove,
  },
]

export function defaultAchievements() {
  return { unlockedIds: [], workoutCount: 0, streak: 0, lastWorkoutDate: null }
}

// Returns array of newly unlocked achievement IDs
export function checkNewAchievements(current, stats) {
  const already = new Set(current.unlockedIds)
  return ACHIEVEMENTS
    .filter(a => !already.has(a.id) && a.check(stats))
    .map(a => a.id)
}
