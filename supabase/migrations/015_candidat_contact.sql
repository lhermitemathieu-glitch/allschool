-- Migration 015 : ajout email et téléphone sur le profil candidat
ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS email      TEXT,
  ADD COLUMN IF NOT EXISTS telephone  TEXT;
