-- Habilita Row Level Security nas tabelas da EasyFood.
--
-- No Supabase, o schema "public" é exposto automaticamente pela Data API (REST),
-- acessível com a chave pública "anon". Sem RLS, qualquer pessoa com essa chave
-- poderia ler a tabela "User" (incluindo os hashes de senha) ou gravar
-- restaurantes sem passar pela autenticação JWT da API.
--
-- Nenhuma policy é criada: os papéis da Data API (anon/authenticated) ficam sem
-- acesso. A API da EasyFood não é afetada, pois o Prisma conecta com o dono das
-- tabelas, que não é restringido pelo RLS.
ALTER TABLE "Restaurant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
