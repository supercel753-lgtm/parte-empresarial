-- CriAItor 3D - Migração de dados empresariais para Supabase
-- Execute uma única vez no SQL Editor do projeto Supabase já configurado.

alter table public.catalogo
    add column if not exists pedidos jsonb not null default '[]'::jsonb,
    add column if not exists custos jsonb not null default '[]'::jsonb,
    add column if not exists filamentos jsonb not null default '[]'::jsonb,
    add column if not exists prec_config jsonb not null default '{}'::jsonb,
    add column if not exists adicionais jsonb not null default '[]'::jsonb,
    add column if not exists historico jsonb not null default '[]'::jsonb,
    add column if not exists importacoes jsonb not null default '[]'::jsonb,
    add column if not exists empresa_versao bigint not null default 0,
    add column if not exists atualizado_em timestamptz not null default now();

update public.catalogo
set
    pedidos = coalesce(pedidos, '[]'::jsonb),
    custos = coalesce(custos, '[]'::jsonb),
    filamentos = coalesce(filamentos, '[]'::jsonb),
    prec_config = coalesce(prec_config, '{}'::jsonb),
    adicionais = coalesce(adicionais, '[]'::jsonb),
    historico = coalesce(historico, '[]'::jsonb),
    importacoes = coalesce(importacoes, '[]'::jsonb),
    empresa_versao = coalesce(empresa_versao, 0),
    atualizado_em = now()
where id = 1;

-- IMPORTANTE:
-- O site atual usa uma chave publishable no navegador e não possui login.
-- Esta migração NÃO cria políticas anônimas novas e preserva a segurança/RLS
-- que você já configurou para a tabela catalogo e o bucket projetos.
-- Se uploads falharem por RLS, ajuste as políticas no Supabase conscientemente;
-- não use service_role no navegador.
