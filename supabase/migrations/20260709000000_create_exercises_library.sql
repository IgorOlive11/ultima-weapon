-- Biblioteca de exercícios (fonte: ExerciseDB free/oss, ver src/lib/exerciseSource.js).
-- Conteúdo de referência, não dado pessoal do usuário — leitura pública, escrita só admin.
-- Populada via scripts/seedExercises.mjs (npm run seed:exercises), nunca em runtime.
CREATE TABLE IF NOT EXISTS public.exercises_library (
  id                text        PRIMARY KEY,           -- exerciseId da fonte (ex. ExerciseDB)
  name              text        NOT NULL,               -- nome original (inglês)
  name_pt           text,                                -- alias em português, opcional (bloco 4)
  gif_url           text        NOT NULL,
  target_muscles    text[]      NOT NULL DEFAULT '{}',
  secondary_muscles text[]      NOT NULL DEFAULT '{}',
  body_parts        text[]      NOT NULL DEFAULT '{}',
  equipments        text[]      NOT NULL DEFAULT '{}',
  instructions      text[]      NOT NULL DEFAULT '{}',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

-- Qualquer um lê (conteúdo de referência da biblioteca, não precisa nem estar logado)
CREATE POLICY "read_exercises_library" ON public.exercises_library
  FOR SELECT
  USING (true);

-- Só admin escreve (seed roda com service role e ignora RLS; esta policy cobre edição
-- futura via app, ex. algum admin ajustando name_pt na mão)
CREATE POLICY "admin_write_exercises_library" ON public.exercises_library
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Índices pra filtro por músculo/parte do corpo/equipamento (contains em array)
CREATE INDEX IF NOT EXISTS idx_exercises_library_target_muscles ON public.exercises_library USING GIN (target_muscles);
CREATE INDEX IF NOT EXISTS idx_exercises_library_body_parts     ON public.exercises_library USING GIN (body_parts);
CREATE INDEX IF NOT EXISTS idx_exercises_library_equipments     ON public.exercises_library USING GIN (equipments);
CREATE INDEX IF NOT EXISTS idx_exercises_library_name           ON public.exercises_library USING GIN (to_tsvector('simple', name));
