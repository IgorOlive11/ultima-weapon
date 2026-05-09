# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server (Vite, porta 5173)
npm run build      # build de produção
npm run preview    # preview do build

supabase functions deploy <nome> --no-verify-jwt   # deploy de edge function
supabase functions deploy send-email --no-verify-jwt  # send-email SEMPRE com --no-verify-jwt (Auth Hook)
supabase secrets list                              # listar secrets das edge functions
```

Não há testes automatizados nem linter configurado.

## Arquitetura

**Stack:** React 18 + Vite, Zustand (estado global com persist), Tailwind CSS, Framer Motion, Supabase (auth + banco + edge functions), Resend (e-mail).

### Estado global — `src/hooks/useStore.js`

Toda a lógica de negócio vive aqui. O store usa `zustand/persist` com key `uw-store-v3`. Dados persistidos no localStorage: `logs`, `userProfile`, `microLog`, `mealLog`, `userProtocol`, `activeWorkout`, `restTimer`, `exerciseHistory`, `savedExercises`. `authUser` **não** é persistido.

Sincronização com Supabase é feita via `scheduleSyncSection(section, get)` — debounce de 1500ms que faz upsert na tabela `user_data`. Seções disponíveis: `logs`, `userProtocol`, `userProfile`, `exerciseHistory`, `savedExercises`, `mealLog`, `microLog`.

Quando um trainer está visualizando dados de aluno (`viewingUserId` preenchido), os saves passam pela edge function `save-student-data` (service role, bypassa RLS). Snapshots do próprio estado do trainer são salvos em `localStorage` key `uw-trainer-snapshot`.

### Auth — `src/hooks/useAuth.js`

Escuta `onAuthStateChange`. `SIGNED_IN` → chama `loadUser` → busca perfil da tabela `profiles` → `setAuthUser`. `SIGNED_OUT` → `clearAuth`. `signOut` no store chama `clearAuth()` imediatamente (sem esperar Supabase) e depois `supabase.auth.signOut()` em background.

### Banco de dados (Supabase)

Duas tabelas:
- **`user_data`**: `(user_id, section)` PRIMARY KEY, coluna `data jsonb`. Todos os dados do usuário (protocolo, logs, etc.) ficam aqui como JSON por seção.
- **`profiles`**: `(id, name, role, trainer_id)`. Roles: `student`, `trainer`, `admin`. Criado automaticamente via trigger `on_auth_user_created`.

RLS: usuário acessa só os próprios dados; trainer/admin acessam qualquer dado via policy que lê `user_metadata.role` do JWT.

### Edge Functions (`supabase/functions/`)

- **`send-email`**: Auth Hook do Supabase — chamada automaticamente no signup/recovery. Usa Resend API (`RESEND_API_KEY` secret). **Deve ser deployada com `--no-verify-jwt`** porque o Auth Hook não envia JWT de usuário. Retorna sempre `Content-Type: application/json`.
- **`get-student-data`**: Lê `user_data` de um aluno com service role (bypassa RLS). Chamada pelo frontend quando trainer acessa dados de aluno.
- **`save-student-data`**: Salva `user_data` de um aluno com service role.

### Protocolo de treino — `src/data/protocol.js`

Estrutura central: 8 semanas × 7 dias. Cada dia tem `exercises[]`, cada exercício tem `sets[]`. Cada set tem `type` (NORMAL, REST_PAUSE, MUSCLE_ROUND, WIDOWMAKER, PULSE) e `repRange` (string `"6-8"`).

`buildWorkoutSteps(exercises)` transforma o protocolo em lista linear de steps para a sessão ativa: `WEIGHT_QUESTION` (calibração de carga), `WARMUP`, `FEEDER`, `WORKING_SET`, `REST`.

`GER_CONFIG` define a escala de esforço (Grau de Esforço Relativo, 7–13) com faces do Doom Guy associadas.

### Sessão de treino ativa — `activeWorkout` no store

`startWorkout(weekIdx, dayIdx)` → gera steps via `buildWorkoutSteps` → salva em `activeWorkout`.
`advanceWorkoutStep()` → avança o step atual.
`completeWorkout()` → agrega resultados por exercício → chama `saveLog` e `saveExerciseHistory`.

O componente `ActiveWorkout` em `WorkoutPage.jsx` é o player da sessão. Usa `viewingStepIdx` (local) separado de `currentStepIdx` (store) para permitir navegar entre steps sem avançar o treino.

### Gamificação — `WorkoutPage.jsx`

`checkGamification(history)` compara as séries NORMAL do histórico anterior contra o `repRange`. Retorna `'angry'` (abaixo do range), `'happy'` (acima), ou `null`. O popup (`GamificationPopup`) dispara ao chegar num step `WEIGHT_QUESTION` que ainda não foi exibido na sessão. O `useEffect` depende de `[viewingStepIdx, exerciseHistory]` para re-checar quando o Supabase terminar a hidratação.

### Design system

Cores customizadas no `tailwind.config.js`: `neon` (#FF1414, vermelho), `bg` (#080808), `s1/s2/s3` (superfícies), `border1/border2`. Fontes: `font-display` (Metal Mania), `font-mono` (Share Tech Mono), `font-body` (Barlow Condensed). Classes utilitárias como `btn-primary`, `scanlines` estão em CSS global.

### Roles e acesso

- `student`: acessa só os próprios dados
- `trainer`: acessa aba "ALUNOS" (`TrainerPage`), pode visualizar/editar dados de alunos via `setViewingUser`
- `admin`: acessa aba "ADMIN" (`AdminPage`) além de tudo do trainer

`ViewingAsBanner` exibe banner quando trainer está no modo de visualização de aluno.
