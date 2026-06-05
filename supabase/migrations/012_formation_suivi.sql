-- Table : statuts posés par un candidat sur une formation
CREATE TABLE IF NOT EXISTS formation_statuts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  statut       text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (candidat_id, formation_id)
);

-- Table : action unique par candidat sur une formation
CREATE TABLE IF NOT EXISTS formation_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation_id uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  texte        text NOT NULL,
  echeance     date,
  fait         boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (candidat_id, formation_id)
);

-- RLS : chaque candidat ne voit que ses propres données
ALTER TABLE formation_statuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidat_own_statuts" ON formation_statuts
  FOR ALL TO authenticated
  USING (candidat_id = auth.uid())
  WITH CHECK (candidat_id = auth.uid());

CREATE POLICY "candidat_own_actions" ON formation_actions
  FOR ALL TO authenticated
  USING (candidat_id = auth.uid())
  WITH CHECK (candidat_id = auth.uid());
