-- Recria as políticas de trainer/admin usando a tabela profiles
-- (o JWT pode estar desatualizado; profiles sempre tem o role atual)

DROP POLICY IF EXISTS "trainer_admin_all" ON public.user_data;

CREATE POLICY "trainer_admin_all" ON public.user_data
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('trainer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('trainer', 'admin')
    )
  );
