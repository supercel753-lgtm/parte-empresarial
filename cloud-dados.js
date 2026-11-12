(function () {
  "use strict";
  // Um snapshot versionado reúne os seis módulos. Gravações são sequenciais;
  // conflitos NÃO substituem silenciosamente dados de outra sessão/dispositivo.
  const sb = window.sb;
  const TABLE = "criaitor_empresa_estado";
  const CHAVES = Object.freeze({
    pedidos: "criaitor3d_pedidos",
    custos: "criaitor3d_custos",
    filamentos: "criaitor3d_filamentos",
    precConfig: "criaitor3d_precificacao_config",
    adicionais: "criaitor3d_precificacao_adicionais",
    historico: "criaitor3d_precificacao_historico"
  });
  const FLAG = "criaitor3d_nuvem_ativada_v1";
  const PENDENTE = "criaitor3d_nuvem_pendente_v1";
  let versao = null;
  let ativo = false;
  let enviando = false;
  let modificado = false;
  let temporizador = null;
  let atualizarInterface = () => {};
  const $ = id => document.getElementById(id);

  function indicador(mensagem, classe = "") {
    const elemento = $("estado-dados-nuvem");
    if (elemento) { elemento.textContent = mensagem; elemento.className = "estado-dados-nuvem " + classe; }
  }
  function lerJSON(chave, valorPadrao) {
    try { const texto = localStorage.getItem(chave); return texto === null ? valorPadrao : JSON.parse(texto); }
    catch { return valorPadrao; }
  }
  function snapshot() {
    return Object.fromEntries(Object.entries(CHAVES).map(([nome, chave]) => [nome, lerJSON(chave, nome === "precConfig" ? {} : [])]));
  }
  function possuiDadosLocais() {
    return Object.values(CHAVES).some(chave => localStorage.getItem(chave) !== null);
  }
  function aplicarDados(dados, avisarInterface = true) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) throw new Error("Dados remotos inválidos.");
    // Validar todos os campos ANTES de modificar qualquer chave local.
    for (const nome of Object.keys(CHAVES)) {
      if (!(nome in dados)) continue;
      const valor = dados[nome];
      if (nome !== "precConfig" && !Array.isArray(valor)) throw new Error(`Formato inválido: ${nome}.`);
      if (nome === "precConfig" && (!valor || typeof valor !== "object" || Array.isArray(valor))) throw new Error("Configuração de preço inválida.");
    }
    for (const [nome, chave] of Object.entries(CHAVES)) {
      if (!(nome in dados)) localStorage.removeItem(chave);
      else localStorage.setItem(chave, JSON.stringify(dados[nome]));
    }
    if (avisarInterface) atualizarInterface();
  }
  async function buscar() {
    if (!sb) throw new Error("Supabase indisponível.");
    const { data, error } = await sb.from(TABLE).select("dados, versao").eq("id", 1).single();
    if (error || !data) throw new Error("Não foi possível ler os dados da empresa. Execute o SQL. " + (error?.message || "Registro ausente"));
    if (!Number.isSafeInteger(Number(data.versao))) throw new Error("Versão remota inválida.");
    return data;
  }
  async function iniciar(callback) {
    atualizarInterface = callback;
    if (!sb) { indicador("Sem conexão · dados locais", "erro"); return; }
    try {
      const remoto = await buscar();
      versao = Number(remoto.versao);
      const ativouAntes = localStorage.getItem(FLAG) === "sim";
      const pendente = localStorage.getItem(PENDENTE) === "sim";
      if (pendente || (!ativouAntes && possuiDadosLocais())) {
        ativo = false;
        indicador("Dados locais encontrados · escolha enviar ou carregar da nuvem", "atencao");
        return;
      }
      // Em uma sessão já vinculada e sem pendências, a nuvem é a fonte de verdade.
      aplicarDados(remoto.dados || {}, false);
      localStorage.setItem(FLAG, "sim");
      localStorage.removeItem(PENDENTE);
      ativo = true;
      atualizarInterface();
      indicador(`Dados na nuvem · versão ${versao}`, "ok");
    } catch (erro) {
      ativo = false;
      indicador(erro.message, "erro");
      console.error(erro);
    }
  }
  function notificarAlteracao() {
    // Chamado APÓS salvar em localStorage. Nunca promete sincronização antecipada.
    localStorage.setItem(PENDENTE, "sim");
    if (!ativo) { indicador("Alterações locais ainda não sincronizadas", "atencao"); return; }
    modificado = true;
    indicador("Alterações aguardando sincronização...", "atencao");
    clearTimeout(temporizador);
    temporizador = setTimeout(enviar, 450);
  }
  async function enviar() {
    if (!ativo || enviando || !modificado) return;
    enviando = true;
    try {
      while (modificado && ativo) {
        modificado = false;
        const conteudo = snapshot();
        const esperado = versao;
        const { data, error } = await sb.from(TABLE)
          .update({ dados: conteudo, versao: esperado + 1, atualizado_em: new Date().toISOString() })
          .eq("id", 1).eq("versao", esperado).select("versao");
        if (error) throw error;
        if (!data?.length) throw new Error("Conflito: os dados mudaram em outro dispositivo. Exporte um backup antes de escolher qual versão manter.");
        versao = Number(data[0].versao);
      }
      localStorage.removeItem(PENDENTE);
      indicador(`Dados sincronizados · versão ${versao}`, "ok");
    } catch (erro) {
      ativo = false;
      localStorage.setItem(PENDENTE, "sim");
      indicador("Não sincronizado: " + erro.message, "erro");
      console.error("Sincronização da empresa interrompida", erro);
    } finally {
      enviando = false;
    }
  }
  async function carregarRemoto() {
    if (!confirm("Carregar a nuvem substituirá os dados locais deste navegador. Exporte um backup antes. Deseja continuar?")) return;
    if (enviando) { alert("Aguarde a gravação atual terminar."); return; }
    try {
      const remoto = await buscar();
      aplicarDados(remoto.dados || {});
      versao = Number(remoto.versao);
      localStorage.setItem(FLAG, "sim");
      localStorage.removeItem(PENDENTE);
      ativo = true;
      modificado = false;
      indicador(`Dados da nuvem carregados · versão ${versao}`, "ok");
    } catch (erro) { indicador(erro.message, "erro"); }
  }
  async function enviarLocal() {
    if (!confirm("ENVIAR DADOS LOCAIS: o conteúdo deste navegador substituirá os dados da empresa no Supabase. Exporte um backup de ambos antes de prosseguir. Confirmar?")) return;
    if (enviando) { alert("Já existe uma gravação em andamento."); return; }
    try {
      // Releitura intencional da versão, para uma substituição confirmada e identificável.
      const remoto = await buscar();
      versao = Number(remoto.versao);
      ativo = true;
      modificado = true;
      localStorage.setItem(FLAG, "sim");
      await enviar();
    } catch (erro) { ativo = false; indicador(erro.message, "erro"); }
  }
  async function conferirAtualizacao() {
    if (!ativo || enviando || modificado || localStorage.getItem(PENDENTE) === "sim") return;
    if (["#modal-pedido", "#modal-custo", "#modal-filamento"].some(seletor => document.querySelector(seletor)?.open)) return;
    try {
      const remoto = await buscar();
      if (Number(remoto.versao) !== versao) {
        versao = Number(remoto.versao);
        aplicarDados(remoto.dados || {});
        indicador(`Atualizado de outro dispositivo · versão ${versao}`, "ok");
      }
    } catch (erro) { indicador("Não foi possível verificar dados da empresa: " + erro.message, "erro"); }
  }
  window.CRIAITOR_CLOUD = {
    iniciar, notificarAlteracao, carregarRemoto, enviarLocal, conferirAtualizacao,
    getEstado: () => ({ ativo, versao, pendente: localStorage.getItem(PENDENTE) === "sim" })
  };
  // Os botões existem mesmo se o início remoto falhar.
  function eventos() {
    $("enviar-dados-local")?.addEventListener("click", enviarLocal);
    $("carregar-dados-remoto")?.addEventListener("click", carregarRemoto);
    window.addEventListener("online", conferirAtualizacao);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) conferirAtualizacao(); });
    setInterval(() => { if (!document.hidden) conferirAtualizacao(); }, 45000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", eventos, { once: true });
  else eventos();
})();
