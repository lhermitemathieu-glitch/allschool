-- Stocke le snapshot complet de la formation LBA (objet normalisé)
ALTER TABLE formations ADD COLUMN IF NOT EXISTS lba_data JSONB;
