-- Tradução manual das instruções (ver src/lib/exerciseSource.js). Ao contrário de
-- name_pt (apelido livre, editável por qualquer admin), instructions_pt é preenchido
-- só pontualmente pra exercícios que o usuário realmente usa no protocolo — nunca
-- traduzido em massa/automaticamente (ver decisão registrada na fase 5 da lib de
-- exercícios). NULL = sem tradução, UI cai pro instructions (inglês).
ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS instructions_pt text[];
