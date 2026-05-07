-- Recria user_data com schema correto (user_id + section como PK composta)
-- Migra dados de 'protocol' existentes para a nova estrutura

-- 1. Cria nova tabela com schema correto
CREATE TABLE public.user_data_v2 (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section    text        NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section)
);

-- 2. Migra dados existentes da coluna 'protocol' para a nova estrutura
INSERT INTO public.user_data_v2 (user_id, section, data, updated_at)
SELECT user_id, 'userProtocol', protocol, updated_at
FROM public.user_data
WHERE protocol IS NOT NULL;

-- 3. Substitui a tabela antiga
DROP TABLE public.user_data;
ALTER TABLE public.user_data_v2 RENAME TO user_data;

-- 4. RLS
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data" ON public.user_data
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trainer_admin_all" ON public.user_data
  FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'));
