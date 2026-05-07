-- Tabela principal de dados do usuário (protocolo, logs, dieta, etc.)
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section    text        NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section)
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Usuário lê/escreve os próprios dados
CREATE POLICY "own_data" ON public.user_data
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trainer e admin lêem/escrevem dados de qualquer usuário
CREATE POLICY "trainer_admin_all" ON public.user_data
  FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'));

-- Tabela de perfis (nome, role, trainer_id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  role       text        NOT NULL DEFAULT 'student',
  trainer_id uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado lê perfis (para o trainer listar alunos)
CREATE POLICY "read_profiles" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Usuário atualiza o próprio perfil
CREATE POLICY "own_profile" ON public.profiles
  FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin atualiza qualquer perfil
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Trigger: cria perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
