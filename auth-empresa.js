(function () {
  "use strict";
  const sb = window.sb;
  let resolver;
  const acesso = new Promise(resolve => { resolver = resolve; });
  let autorizado = false;
  let usuario = null;
  const $ = seletor => document.querySelector(seletor);

  function mensagem(texto, erro = false) {
    const elemento = $("#login-status");
    if (!elemento) return;
    elemento.textContent = texto;
    elemento.classList.toggle("erro", erro);
  }

  function mostrarLogin() {
    $("#app")?.setAttribute("hidden", "");
    $("#login-screen")?.removeAttribute("hidden");
  }

  function mostrarPainel() {
    $("#login-screen")?.setAttribute("hidden", "");
    $("#app")?.removeAttribute("hidden");
    if ($("#usuario-logado")) $("#usuario-logado").textContent = usuario?.email || "Administrador";
  }

  async function checarPermissao() {
    const { data: sessao, error: erroSessao } = await sb.auth.getSession();
    if (erroSessao) throw erroSessao;
    if (!sessao?.session?.user) return false;
    const { data, error } = await sb.rpc("criaitor_eh_admin");
    if (error) throw new Error("Não foi possível verificar o administrador. Execute o SQL de instalação. " + error.message);
    if (data !== true) {
      await sb.auth.signOut();
      throw new Error("Este usuário não está autorizado. Cadastre o ID dele na tabela criaitor_administradores.");
    }
    usuario = sessao.session.user;
    return true;
  }

  async function entrar(evento) {
    evento.preventDefault();
    if (!sb) { mensagem("Supabase indisponível. Verifique a conexão e a configuração.", true); return; }
    const btn = $("#login-enviar");
    btn.disabled = true;
    mensagem("Verificando seu acesso...");
    try {
      const email = $("#login-email").value.trim();
      const senha = $("#login-senha").value;
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      autorizado = await checarPermissao();
      if (!autorizado) throw new Error("Acesso não autorizado.");
      $("#login-senha").value = "";
      mostrarPainel();
      resolver();
    } catch (erro) {
      mensagem(erro.message || "Não foi possível entrar.", true);
      mostrarLogin();
    } finally { btn.disabled = false; }
  }

  async function sair() {
    if (!confirm("Sair do painel? Confira se os dados foram sincronizados antes de continuar.")) return;
    await sb?.auth.signOut();
    // Não apagar dados locais automaticamente: podem conter alterações pendentes.
    window.location.reload();
  }

  async function iniciar() {
    $("#login-form")?.addEventListener("submit", entrar);
    $("#sair-conta")?.addEventListener("click", sair);
    mostrarLogin();
    if (!sb) { mensagem("Biblioteca Supabase indisponível. Confira o acesso à internet.", true); return; }
    try {
      mensagem("Conferindo sessão...");
      autorizado = await checarPermissao();
      if (autorizado) { mostrarPainel(); resolver(); }
      else mensagem("Entre com o e-mail e a senha cadastrados no Supabase Auth.");
    } catch (erro) { mensagem(erro.message, true); }
  }

  window.CRIAITOR_AUTH = {
    aguardarAcesso: () => acesso,
    getUsuario: () => usuario,
    autorizado: () => autorizado,
    sair
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
