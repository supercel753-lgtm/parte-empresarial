(function () {
"use strict";

const sb = window.sb;
const cfg = window.CRIAITOR_SUPABASE_CONFIG || {};

const CONFIG = Object.freeze({
    tabela: cfg.tabelaCatalogo || "catalogo",
    registro: cfg.registroCatalogo || 1,
    campos: cfg.camposEmpresa || {
        pedidos: "pedidos",
        custos: "custos",
        filamentos: "filamentos",
        precConfig: "prec_config",
        adicionais: "adicionais",
        historico: "historico",
        importacoes: "importacoes"
    }
});

const STORAGE_KEYS = Object.freeze({
    pedidos: "criaitor3d_pedidos",
    custos: "criaitor3d_custos",
    filamentos: "criaitor3d_filamentos",
    precConfig: "criaitor3d_precificacao_config",
    adicionais: "criaitor3d_precificacao_adicionais",
    historico: "criaitor3d_precificacao_historico"
});

let estadoRemoto = null;
let empresaVersao = 0;
let fila = Promise.resolve();
const timers = new Map();

function copiar(v) {
    try { return structuredClone(v); }
    catch { return JSON.parse(JSON.stringify(v)); }
}

function salvarLocal(chave, valor) {
    if (!chave) return;
    localStorage.setItem(chave, JSON.stringify(valor));
}

function hidratarLocal(data) {
    if (!data) return;
    for (const [nome, chave] of Object.entries(STORAGE_KEYS)) {
        const coluna = CONFIG.campos[nome];
        const valor = data[coluna];
        if (valor !== null && valor !== undefined) salvarLocal(chave, valor);
    }
}

async function carregar() {
    if (!sb) throw new Error("Supabase não inicializado.");
    const colunas = [
        "id", "empresa_versao",
        ...Object.values(CONFIG.campos)
    ].join(",");

    const { data, error } = await sb
        .from(CONFIG.tabela)
        .select(colunas)
        .eq("id", CONFIG.registro)
        .single();

    if (error) throw error;
    estadoRemoto = data || {};
    empresaVersao = Number(data?.empresa_versao) || 0;
    hidratarLocal(data);
    return copiar(data);
}

function enfileirar(tarefa) {
    fila = fila.then(tarefa, tarefa);
    return fila;
}

async function salvarModuloInterno(nome, valor) {
    const coluna = CONFIG.campos[nome];
    if (!coluna) throw new Error(`Módulo Supabase inválido: ${nome}`);

    // Lê a versão remota imediatamente antes de gravar.
    // Isso evita reduzir a versão quando outra sessão salvou dados.
    const { data: versaoAtual, error: erroVersao } = await sb
        .from(CONFIG.tabela)
        .select("empresa_versao")
        .eq("id", CONFIG.registro)
        .single();

    if (erroVersao) throw erroVersao;

    const novaVersao = (Number(versaoAtual?.empresa_versao) || 0) + 1;
    const payload = {
        [coluna]: valor,
        empresa_versao: novaVersao,
        atualizado_em: new Date().toISOString()
    };

    const { data, error } = await sb
        .from(CONFIG.tabela)
        .update(payload)
        .eq("id", CONFIG.registro)
        .select(`empresa_versao,${coluna}`)
        .single();

    if (error) throw error;
    empresaVersao = Number(data?.empresa_versao) || novaVersao;
    estadoRemoto = { ...(estadoRemoto || {}), ...data };
    return data;
}

function salvarModulo(nome, valor) {
    const copia = copiar(valor);
    return enfileirar(() => salvarModuloInterno(nome, copia));
}

function salvarModuloDebounced(nome, valor, atraso = 350) {
    if (timers.has(nome)) clearTimeout(timers.get(nome));
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            timers.delete(nome);
            salvarModulo(nome, valor).then(resolve, reject);
        }, atraso);
        timers.set(nome, timer);
    });
}

function salvarTudo(dados = {}) {
    return enfileirar(async () => {
        const { data: versaoAtual, error: erroVersao } = await sb
            .from(CONFIG.tabela)
            .select("empresa_versao")
            .eq("id", CONFIG.registro)
            .single();

        if (erroVersao) throw erroVersao;

        const payload = {
            empresa_versao: (Number(versaoAtual?.empresa_versao) || 0) + 1,
            atualizado_em: new Date().toISOString()
        };
        for (const [nome, coluna] of Object.entries(CONFIG.campos)) {
            if (Object.prototype.hasOwnProperty.call(dados, nome)) {
                payload[coluna] = copiar(dados[nome]);
            }
        }
        const { data, error } = await sb
            .from(CONFIG.tabela)
            .update(payload)
            .eq("id", CONFIG.registro)
            .select("empresa_versao")
            .single();
        if (error) throw error;
        empresaVersao = Number(data?.empresa_versao) || payload.empresa_versao;
        return data;
    });
}

async function registrarImportacao(meta) {
    let lista = Array.isArray(estadoRemoto?.[CONFIG.campos.importacoes])
        ? copiar(estadoRemoto[CONFIG.campos.importacoes])
        : [];
    lista.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        ...meta,
        criado_em: new Date().toISOString()
    });
    lista = lista.slice(0, 250);
    await salvarModulo("importacoes", lista);
    if (!estadoRemoto) estadoRemoto = {};
    estadoRemoto[CONFIG.campos.importacoes] = lista;
    return lista[0];
}

window.CRIAITOR_DB = Object.freeze({
    carregar,
    salvarModulo,
    salvarModuloDebounced,
    salvarTudo,
    registrarImportacao,
    getEmpresaVersao: () => empresaVersao,
    getEstado: () => copiar(estadoRemoto || {})
});

window.CRIAITOR_DB_READY = carregar().catch(erro => {
    console.warn("Supabase empresarial indisponível; mantendo cache local.", erro);
    return null;
});
})();
