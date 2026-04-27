# Ultima Weapon — Workout Tracker

8 Week Low Volume Training Protocol by Mr. Saizen · Weapons of Mass Construction

## Stack

- React 18 + Vite
- Zustand (state + localStorage persistence)
- React Router DOM
- CSS Modules

## Setup

```bash
npm install
npm run dev
```

## Build & Deploy (Vercel)

```bash
npm run build
# ou só conecta o repo no Vercel — ele detecta Vite automaticamente
```

### Variáveis de ambiente

Nenhuma necessária.

### Configuração Vercel

O Vercel detecta automaticamente projetos Vite. Basta:
1. Conectar o repositório
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

## Rostos do Doom Guy

Coloque os PNGs dos rostos na pasta `public/doom-faces/`:

```
public/
  doom-faces/
    ger7.png   ← GER 7 (calmão)
    ger8.png   ← GER 8
    ger9.png   ← GER 9
    ger10.png  ← GER 10
    ger11.png  ← GER 11 (sadomasoquista)
    ger12.png  ← GER 12 (violência gratuita)
    ger13.png  ← GER 13 (widowmaker)
```

Se os PNGs não estiverem presentes, o app usa um renderer canvas como fallback automaticamente.

## PWA — iOS

Para instalar como app no iPhone:
1. Abrir no Safari
2. Botão compartilhar → "Adicionar à Tela de Início"

## Estrutura

```
src/
  components/
    DoomFace.jsx          # Rosto do Doom Guy — PNG ou canvas fallback
    ExerciseCard.jsx      # Card de exercício com inputs de log
  data/
    protocol.js           # Todos os 8 treinos completos
  hooks/
    useStore.js           # Zustand store (nav + logs)
  pages/
    WorkoutPage.jsx       # Treino do dia
    TimerPage.jsx         # Timer de descanso + legenda de séries
    HistoryPage.jsx       # Histórico de cargas
    SettingsPage.jsx      # Data de início + visão geral
  App.jsx                 # Layout + bottom nav
  index.css               # Global styles
  main.jsx                # Entry point
public/
  doom-faces/             # Coloque os PNGs aqui
  manifest.json           # PWA manifest
```

## Adicionando Dieta de Bulking (futuro)

O store já está preparado para extensão. Para adicionar:
1. Criar `src/data/diet.js` com as refeições/macros
2. Criar `src/pages/DietPage.jsx`
3. Adicionar tab no `TABS` array em `App.jsx`
