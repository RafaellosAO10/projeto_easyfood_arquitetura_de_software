-- Busca de restaurantes sem diferenciar acentos (GET /restaurants?search=, ADR-011).
-- unaccent faz parte do contrib do PostgreSQL e já vem na imagem oficial postgres:17.
CREATE EXTENSION IF NOT EXISTS unaccent;
