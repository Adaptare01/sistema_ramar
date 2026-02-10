-- SCRIPT DE LIMPEZA GERAL DO BANCO DE DADOS
-- ATENÇÃO: ISSO APAGARÁ TODAS AS CARGAS, VOLUMES E ITENS DO SISTEMA.
-- Use isso apenas se quiser zerar o sistema para reiniciar a importação de produtos.

BEGIN;

-- 1. Limpar tabelas que dependem dos produtos/cargas primeiro (Ordem de dependência)
TRUNCATE TABLE volume_itens CASCADE;
TRUNCATE TABLE volumes CASCADE;
TRUNCATE TABLE carga_itens CASCADE;
TRUNCATE TABLE cargas CASCADE;

-- 2. Agora é seguro limpar os produtos e clientes
TRUNCATE TABLE produtos CASCADE;
TRUNCATE TABLE clientes CASCADE;

COMMIT;

-- Se o TRUNCATE não funcionar por permissão, use os DELETEs abaixo:
-- DELETE FROM volume_itens;
-- DELETE FROM volumes;
-- DELETE FROM carga_itens;
-- DELETE FROM cargas;
-- DELETE FROM produtos;
