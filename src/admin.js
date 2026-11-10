(function () {

"use strict";


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const CONFIG = {

    tabela: "catalogo",

    registro: 1,

    titulo: "CriAItor 3D"

};


const sb = window.sb;


/* =====================================================
   ESTADO
===================================================== */

const estado = {

    produtos: [],

    pedidos: [],

    custos: [],

    filamentos: [],

    versao: 0,

    pagina: "dashboard",

    produtoEditando: null,

    pedidoEditando: null,

    custoEditando: null,

    filamentoEditando: null,

    salvandoCatalogo: false

};


/* =====================================================
   ATALHOS
===================================================== */

const $ = seletor =>
    document.querySelector(seletor);


const $$ = seletor =>
    Array.from(
        document.querySelectorAll(seletor)
    );


/* =====================================================
   UTILITÁRIOS
===================================================== */

function numero(valor) {

    const resultado =
        Number(valor);

    return Number.isFinite(resultado)
        ? resultado
        : 0;

}


function dinheiro(valor) {

    return new Intl.NumberFormat(

        "pt-BR",

        {

            style: "currency",

            currency: "BRL"

        }

    ).format(

        numero(valor)

    );

}


function escaparHTML(valor) {

    return String(valor ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#39;");

}


function criarID() {

    if (

        window.crypto &&
        crypto.randomUUID

    ) {

        return crypto.randomUUID();

    }


    return (

        Date.now().toString(36) +

        Math.random()
            .toString(36)
            .slice(2)

    );

}


function agoraISO() {

    return new Date()
        .toISOString();

}


function dataHoje() {

    return new Date()

        .toISOString()

        .slice(0, 10);

}


function formatarData(valor) {

    if (!valor) {

        return "—";

    }


    let data;


    if (

        String(valor).length === 10

    ) {

        data = new Date(

            valor +
            "T12:00:00"

        );

    } else {

        data = new Date(valor);

    }


    if (

        Number.isNaN(
            data.getTime()
        )

    ) {

        return "—";

    }


    return data.toLocaleDateString(
        "pt-BR"
    );

}


/* =====================================================
   NOTIFICAÇÕES
===================================================== */

let timerAviso;


function avisar(

    mensagem,

    erro = false

) {

    const elemento =
        $("#notificacao");


    if (!elemento) {

        console.log(mensagem);

        return;

    }


    elemento.textContent =
        mensagem;


    elemento.classList.toggle(

        "erro",

        erro

    );


    elemento.classList.add(

        "visivel"

    );


    clearTimeout(
        timerAviso
    );


    timerAviso =
        setTimeout(

            () => {

                elemento.classList.remove(

                    "visivel"

                );

            },

            3500

        );

}


/* =====================================================
   SUPABASE
===================================================== */

function verificarSupabase() {

    if (!sb) {

        throw new Error(

            "Supabase não inicializado. " +

            "Confira src/supabase-config.js."

        );

    }

}


async function carregarCatalogo() {

    const {

        data,

        error

    } = await sb

        .from(CONFIG.tabela)

        .select(
            "produtos, versao"
        )

        .eq(
            "id",
            CONFIG.registro
        )

        .single();


    if (error) {

        throw new Error(

            "Erro ao carregar catálogo: " +

            error.message

        );

    }


    estado.produtos =

        Array.isArray(
            data.produtos
        )

            ? data.produtos

            : [];


    estado.versao =

        numero(
            data.versao
        );


    atualizarPainel();

}


/* =====================================================
   SALVAR PRODUTOS
===================================================== */

async function salvarCatalogo(
    produtos
) {

    if (

        estado.salvandoCatalogo

    ) {

        throw new Error(

            "Já existe uma atualização " +

            "em andamento."

        );

    }


    estado.salvandoCatalogo =
        true;


    try {

        const novaVersao =

            estado.versao + 1;


        const {

            data,

            error

        } = await sb

            .from(CONFIG.tabela)

            .update({

                produtos,

                versao:
                    novaVersao

            })

            .eq(
                "id",
                CONFIG.registro
            )

            .eq(
                "versao",
                estado.versao
            )

            .select(
                "produtos, versao"
            );


        if (error) {

            throw error;

        }


        if (

            !data ||
            !data.length

        ) {

            throw new Error(

                "Não foi possível atualizar " +

                "o catálogo. Recarregue a página."

            );

        }


        estado.produtos =

            data[0].produtos;


        estado.versao =

            numero(
                data[0].versao
            );


        atualizarPainel();


    } finally {

        estado.salvandoCatalogo =
            false;

    }

}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function abrirPagina(nome) {

    estado.pagina =
        nome;


    $$(".pagina")

        .forEach(

            pagina => {

                const ativa =

                    pagina.id ===
                    nome;


                pagina.hidden =
                    !ativa;


                pagina.classList.toggle(

                    "ativa",

                    ativa

                );

            }

        );


    $$("[data-pagina]")

        .forEach(

            botao => {

                botao.classList.toggle(

                    "ativo",

                    botao.dataset.pagina ===
                    nome

                );

            }

        );


    const nomes = {

        dashboard:
            "Visão geral",

        produtos:
            "Produtos",

        pedidos:
            "Pedidos",

        custos:
            "Custos",

        filamentos:
            "Filamentos",

        publicar:
            "Sincronização"

    };


    if ($("#titulo-pagina")) {

        $("#titulo-pagina")
            .textContent =

            nomes[nome] ||
            nome;

    }

}


/* =====================================================
   LOCALSTORAGE
===================================================== */

function chaveLocal(tipo) {

    return (

        "criaitor3d_" +
        tipo

    );

}


function lerLocal(tipo) {

    try {

        const valor =

            localStorage.getItem(

                chaveLocal(tipo)

            );


        if (!valor) {

            return [];

        }


        const dados =
            JSON.parse(valor);


        return Array.isArray(dados)

            ? dados

            : [];


    } catch {

        return [];

    }

}


function gravarLocal(
    tipo,
    dados
) {

    localStorage.setItem(

        chaveLocal(tipo),

        JSON.stringify(dados)

    );

}


function carregarDadosLocais() {

    estado.pedidos =
        lerLocal("pedidos");


    estado.custos =
        lerLocal("custos");


    estado.filamentos =
        lerLocal("filamentos");

}


function salvarPedidos() {

    gravarLocal(

        "pedidos",

        estado.pedidos

    );


    atualizarPainel();

}


function salvarCustos() {

    gravarLocal(

        "custos",

        estado.custos

    );


    atualizarPainel();

}


function salvarFilamentos() {

    gravarLocal(

        "filamentos",

        estado.filamentos

    );


    atualizarPainel();

}


/* =====================================================
   DASHBOARD
===================================================== */

function atualizarIndicadores() {

    const visiveis =

        estado.produtos.filter(

            produto =>

                produto.disponivel !==
                false

        );


    const estoque =

        estado.produtos.reduce(

            (
                total,
                produto
            ) =>

                total +

                numero(
                    produto.estoque
                ),

            0

        );


    const pedidosAbertos =

        estado.pedidos.filter(

            pedido =>

                ![

                    "Entregue",

                    "Cancelado"

                ].includes(
                    pedido.status
                )

        );


    $("#total-produtos")
        .textContent =
        estado.produtos.length;


    $("#total-visiveis")
        .textContent =
        visiveis.length;


    $("#total-estoque")
        .textContent =
        estoque;


    $("#total-pedidos")
        .textContent =
        pedidosAbertos.length;

}


function renderizarRecentes() {

    const container =
        $("#produtos-recentes");


    if (!container) {

        return;

    }


    const lista =

        estado.produtos

        .slice(-5)

        .reverse();


    if (!lista.length) {

        container.innerHTML = `

            <p>
                Nenhum produto cadastrado.
            </p>

        `;

        return;

    }


    container.innerHTML =

        lista.map(

            produto => `

                <div class="produto-recente">

                    ${

                        produto.imagem

                            ? `

                                <img
                                    src="${escaparHTML(
                                        produto.imagem
                                    )}"
                                    alt=""
                                >

                            `

                            : ""

                    }

                    <div
                        class="produto-recente-info"
                    >

                        <strong>

                            ${escaparHTML(
                                produto.nome
                            )}

                        </strong>

                        <span>

                            ${escaparHTML(
                                produto.categoria
                            )}

                        </span>

                    </div>

                    <b>

                        ${dinheiro(
                            produto.preco
                        )}

                    </b>

                </div>

            `

        ).join("");

}


/* =====================================================
   PRODUTOS
===================================================== */

function renderizarProdutos() {

    const tabela =
        $("#tabela-produtos");


    if (!tabela) {

        return;

    }


    const pesquisa =

        (
            $("#buscar-produto")
                ?.value || ""
        )

        .trim()

        .toLowerCase();


    const produtos =

        estado.produtos.filter(

            produto => {

                const texto =

                    `${produto.nome || ""} ${produto.categoria || ""}`

                    .toLowerCase();


                return texto.includes(
                    pesquisa
                );

            }

        );


    $("#contador-produtos")
        .textContent =

        produtos.length === 1

            ? "1 produto"

            : `${produtos.length} produtos`;


    if (!produtos.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="6">

                    Nenhum produto cadastrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        produtos.map(

            produto => `

                <tr>

                    <td>

                        <strong>

                            ${escaparHTML(
                                produto.nome
                            )}

                        </strong>

                        <small>

                            ${escaparHTML(
                                produto.prazo || ""
                            )}

                        </small>

                    </td>

                    <td>

                        ${escaparHTML(
                            produto.categoria
                        )}

                    </td>

                    <td>

                        ${dinheiro(
                            produto.preco
                        )}

                    </td>

                    <td>

                        ${numero(
                            produto.estoque
                        )}

                    </td>

                    <td>

                        <span class="${
                            produto.disponivel !== false
                                ? "visivel"
                                : "oculto"
                        }">

                            ${
                                produto.disponivel !== false
                                    ? "Visível"
                                    : "Oculto"
                            }

                        </span>

                    </td>

                    <td>

                        <button
                            type="button"
                            class="botao-pequeno"
                            data-produto-editar="${escaparHTML(
                                produto.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-produto-excluir="${escaparHTML(
                                produto.id
                            )}"
                        >
                            Excluir
                        </button>

                    </td>

                </tr>

            `

        ).join("");

}


function abrirNovoProduto() {

    estado.produtoEditando =
        null;


    const form =
        $("#form-produto");


    form.reset();


    form.elements.estoque.value =
        0;


    form.elements.prazo.value =
        "Produção sob encomenda";


    form.elements.disponivel.checked =
        true;


    $("#titulo-modal-produto")
        .textContent =
        "Novo produto";


    $("#modal-produto")
        .showModal();

}


function editarProduto(id) {

    const produto =

        estado.produtos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!produto) {

        return;

    }


    estado.produtoEditando =
        produto.id;


    const form =
        $("#form-produto");


    form.reset();


    form.elements.nome.value =
        produto.nome || "";


    form.elements.categoria.value =
        produto.categoria || "";


    form.elements.preco.value =
        numero(
            produto.preco
        );


    form.elements.estoque.value =
        numero(
            produto.estoque
        );


    form.elements.prazo.value =
        produto.prazo || "";


    form.elements.imagem.value =
        produto.imagem || "";


    form.elements.descricao.value =
        produto.descricao || "";


    form.elements.disponivel.checked =

        produto.disponivel !==
        false;


    form.elements.destaque.checked =

        produto.destaque ===
        true;


    form.elements.imagem
        .dispatchEvent(

            new Event("change")

        );


    $("#titulo-modal-produto")
        .textContent =
        "Editar produto";


    $("#modal-produto")
        .showModal();

}


async function salvarProduto(
    evento
) {

    evento.preventDefault();


    const form =
        $("#form-produto");


    const campos =
        form.elements;


    const nome =
        campos.nome
            .value
            .trim();


    const categoria =
        campos.categoria
            .value
            .trim();


    if (

        !nome ||
        !categoria

    ) {

        avisar(

            "Informe nome e categoria.",

            true

        );

        return;

    }


    const anterior =

        estado.produtos.find(

            item =>

                String(item.id) ===

                String(
                    estado.produtoEditando
                )

        );


    const produto = {

        ...(anterior || {}),

        id:

            anterior?.id ||
            criarID(),

        nome,

        categoria,

        preco:

            numero(
                campos.preco.value
            ),

        estoque:

            Math.max(

                0,

                Math.trunc(

                    numero(
                        campos.estoque.value
                    )

                )

            ),

        prazo:

            campos.prazo
                .value
                .trim(),

        imagem:

            campos.imagem
                .value
                .trim(),

        descricao:

            campos.descricao
                .value
                .trim(),

        disponivel:

            campos.disponivel
                .checked,

        destaque:

            campos.destaque
                .checked,

        atualizado_em:
            agoraISO()

    };


    let lista;


    if (anterior) {

        lista =

            estado.produtos.map(

                item =>

                    String(item.id) ===
                    String(anterior.id)

                        ? produto

                        : item

            );

    } else {

        lista = [

            ...estado.produtos,

            produto

        ];

    }


    try {

        await salvarCatalogo(
            lista
        );


        $("#modal-produto")
            .close();


        estado.produtoEditando =
            null;


        avisar(
            "Produto salvo."
        );


    } catch (erro) {

        avisar(

            erro.message,

            true

        );

    }

}


async function excluirProduto(id) {

    const produto =

        estado.produtos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!produto) {

        return;

    }


    if (

        !confirm(

            `Excluir "${produto.nome}"?`

        )

    ) {

        return;

    }


    try {

        await salvarCatalogo(

            estado.produtos.filter(

                item =>

                    String(item.id) !==
                    String(id)

            )

        );


        avisar(
            "Produto excluído."
        );


    } catch (erro) {

        avisar(

            erro.message,

            true

        );

    }

}


/* =====================================================
   PEDIDOS
===================================================== */

function renderizarPedidos() {

    const tabela =
        $("#tabela-pedidos");


    if (!tabela) {

        return;

    }


    if (!estado.pedidos.length) {

        tabela.innerHTML = `

            <tr>

                <td colspan="6">

                    Nenhum pedido registrado.

                </td>

            </tr>

        `;

        return;

    }


    tabela.innerHTML =

        [...estado.pedidos]

        .reverse()

        .map(

            pedido => `

                <tr>

                    <td>

                        <strong>

                            ${escaparHTML(
                                pedido.cliente
                            )}

                        </strong>

                        <small>

                            ${escaparHTML(
                                pedido.contato || ""
                            )}

                        </small>

                    </td>

                    <td>

                        ${escaparHTML(
                            pedido.itens
                        )}

                    </td>

                    <td>

                        ${dinheiro(
                            pedido.valor
                        )}

                    </td>

                    <td>

                        ${escaparHTML(
                            pedido.status
                        )}

                    </td>

                    <td>

                        ${formatarData(
                            pedido.data
                        )}

                    </td>

                    <td>

                        <button
                            type="button"
                            class="botao-pequeno"
                            data-pedido-editar="${escaparHTML(
                                pedido.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-pedido-excluir="${escaparHTML(
                                pedido.id
                            )}"
                        >
                            Excluir
                        </button>

                    </td>

                </tr>

            `

        ).join("");

}


/* =====================================================
   PEDIDO - NOVO
===================================================== */

function abrirNovoPedido() {

    estado.pedidoEditando =
        null;


    $("#form-pedido")
        .reset();


    $("#modal-pedido")
        .showModal();

}


function editarPedido(id) {

    const pedido =

        estado.pedidos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!pedido) {

        return;

    }


    estado.pedidoEditando =
        pedido.id;


    const campos =
        $("#form-pedido")
            .elements;


    campos.cliente.value =
        pedido.cliente || "";


    campos.contato.value =
        pedido.contato || "";


    campos.itens.value =
        pedido.itens || "";


    campos.valor.value =
        numero(
            pedido.valor
        );


    campos.status.value =
        pedido.status ||
        "Novo";


    $("#modal-pedido")
        .showModal();

}


function salvarPedidoEvento(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
            .elements;


    const anterior =

        estado.pedidos.find(

            item =>

                String(item.id) ===

                String(
                    estado.pedidoEditando
                )

        );


    const pedido = {

        ...(anterior || {}),

        id:

            anterior?.id ||
            criarID(),

        cliente:

            campos.cliente
                .value
                .trim(),

        contato:

            campos.contato
                .value
                .trim(),

        itens:

            campos.itens
                .value
                .trim(),

        valor:

            numero(
                campos.valor.value
            ),

        status:

            campos.status.value,

        data:

            anterior?.data ||
            agoraISO(),

        atualizado_em:
            agoraISO()

    };


    if (

        !pedido.cliente ||
        !pedido.itens

    ) {

        avisar(

            "Preencha cliente e produtos.",

            true

        );

        return;

    }


    if (anterior) {

        estado.pedidos =

            estado.pedidos.map(

                item =>

                    String(item.id) ===
                    String(anterior.id)

                        ? pedido

                        : item

            );

    } else {

        estado.pedidos.push(
            pedido
        );

    }


    salvarPedidos();


    estado.pedidoEditando =
        null;


    $("#modal-pedido")
        .close();


    avisar(
        "Pedido salvo."
    );

}


function excluirPedido(id) {

    if (

        !confirm(
            "Excluir este pedido?"
        )

    ) {

        return;

    }


    estado.pedidos =

        estado.pedidos.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    salvarPedidos();

}


/* =====================================================
   CUSTOS
===================================================== */

function custosMesAtual() {

    const hoje =
        new Date();


    return estado.custos.filter(

        item => {

            if (!item.data) {

                return false;

            }


            const data =

                new Date(

                    item.data +
                    "T12:00:00"

                );


            return (

                data.getFullYear() ===
                hoje.getFullYear()

                &&

                data.getMonth() ===
                hoje.getMonth()

            );

        }

    );

}


function renderizarCustos() {

    if (!$("#tabela-custos")) {

        return;

    }


    const mes =
        custosMesAtual();


    const fixos =

        mes.filter(

            item =>
                item.tipo === "Fixo"

        );


    const variaveis =

        mes.filter(

            item =>
                item.tipo === "Variável"

        );


    const somar = lista =>

        lista.reduce(

            (total, item) =>

                total +
                numero(item.valor),

            0

        );


    $("#custos-mes")
        .textContent =
        dinheiro(
            somar(mes)
        );


    $("#custos-fixos")
        .textContent =
        dinheiro(
            somar(fixos)
        );


    $("#custos-variaveis")
        .textContent =
        dinheiro(
            somar(variaveis)
        );


    $("#total-custos")
        .textContent =
        estado.custos.length;


    const pesquisa =

        (
            $("#buscar-custo")
                ?.value || ""
        )

        .toLowerCase();


    const filtro =

        $("#filtro-custo")
            ?.value ||
        "Todos";


    const lista =

        [...estado.custos]

        .filter(

            item => {

                const texto =

                    `${item.descricao} ${item.categoria}`

                    .toLowerCase();


                return (

                    texto.includes(
                        pesquisa
                    )

                    &&

                    (
                        filtro === "Todos" ||

                        item.tipo === filtro
                    )

                );

            }

        )

        .sort(

            (a, b) =>

                String(b.data)
                    .localeCompare(
                        String(a.data)
                    )

        );


    if (!lista.length) {

        $("#tabela-custos")
            .innerHTML = `

                <tr>

                    <td colspan="6">

                        Nenhum custo cadastrado.

                    </td>

                </tr>

            `;

        return;

    }


    $("#tabela-custos")
        .innerHTML =

        lista.map(

            item => `

                <tr>

                    <td>
                        ${escaparHTML(
                            item.descricao
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            item.categoria
                        )}
                    </td>

                    <td>
                        ${escaparHTML(
                            item.tipo
                        )}
                    </td>

                    <td>
                        ${dinheiro(
                            item.valor
                        )}
                    </td>

                    <td>
                        ${formatarData(
                            item.data
                        )}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="botao-pequeno"
                            data-custo-editar="${escaparHTML(
                                item.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="botao-pequeno botao-excluir"
                            data-custo-excluir="${escaparHTML(
                                item.id
                            )}"
                        >
                            Excluir
                        </button>

                    </td>

                </tr>

            `

        ).join("");

}


function abrirNovoCusto() {

    estado.custoEditando =
        null;


    const form =
        $("#form-custo");


    form.reset();


    form.elements.data.value =
        dataHoje();


    $("#titulo-modal-custo")
        .textContent =
        "Novo custo";


    $("#modal-custo")
        .showModal();

}


function editarCusto(id) {

    const custo =

        estado.custos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if (!custo) {

        return;

    }


    estado.custoEditando =
        custo.id;


    const campos =
        $("#form-custo")
            .elements;


    campos.descricao.value =
        custo.descricao || "";


    campos.categoria.value =
        custo.categoria || "";


    campos.tipo.value =
        custo.tipo || "Variável";


    campos.valor.value =
        numero(
            custo.valor
        );


    campos.data.value =
        custo.data ||
        dataHoje();


    campos.observacoes.value =
        custo.observacoes || "";


    $("#titulo-modal-custo")
        .textContent =
        "Editar custo";


    $("#modal-custo")
        .showModal();

}


function salvarCustoEvento(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
            .elements;


    const anterior =

        estado.custos.find(

            item =>

                String(item.id) ===

                String(
                    estado.custoEditando
                )

        );


    const custo = {

        ...(anterior || {}),

        id:

            anterior?.id ||
            criarID(),

        descricao:

            campos.descricao
                .value
                .trim(),

        categoria:

            campos.categoria
                .value
                .trim(),

        tipo:

            campos.tipo.value,

        valor:

            numero(
                campos.valor.value
            ),

        data:

            campos.data.value,

        observacoes:

            campos.observacoes
                .value
                .trim(),

        atualizado_em:
            agoraISO()

    };


    if (

        !custo.descricao ||
        !custo.categoria ||
        !custo.data

    ) {

        avisar(

            "Preencha os campos obrigatórios.",

            true

        );

        return;

    }


    if (anterior) {

        estado.custos =

            estado.custos.map(

                item =>

                    String(item.id) ===
                    String(anterior.id)

                        ? custo

                        : item

            );

    } else {

        estado.custos.push(
            custo
        );

    }


    salvarCustos();


    estado.custoEditando =
        null;


    $("#modal-custo")
        .close();


    avisar(
        "Custo salvo."
    );

}


function excluirCusto(id) {

    if (

        !confirm(
            "Excluir este custo?"
        )

    ) {

        return;

    }


    estado.custos =

        estado.custos.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    salvarCustos();

}


/* =====================================================
   FILAMENTOS
===================================================== */

function custoGrama(item) {

    const peso =
        numero(
            item.pesoOriginal
        );


    if (peso <= 0) {

        return 0;

    }


    return (

        numero(
            item.valorPago
        )

        /

        peso

    );

}


function filamentoBaixo(item) {

    return (

        numero(
            item.pesoRestante
        )

        <=

        numero(
            item.limiteBaixo
        )

    );

}


function atualizarFiltroMateriais() {

    const elemento =
        $("#filtro-material");


    if (!elemento) {

        return;

    }


    const atual =
        elemento.value;


    const materiais =

        Array.from(

            new Set(

                estado.filamentos

                .map(
                    item =>
                        item.material
                )

                .filter(Boolean)

            )

        );


    elemento.innerHTML = `

        <option value="Todos">

            Todos os materiais

        </option>

        ${

            materiais.map(

                item => `

                    <option
                        value="${escaparHTML(
                            item
                        )}"
                    >

                        ${escaparHTML(
                            item
                        )}

                    </option>

                `

            ).join("")

        }

    `;


    if (

        materiais.includes(atual)

    ) {

        elemento.value =
            atual;

    }

}


function renderizarFilamentos() {

    if (!$("#tabela-filamentos")) {

        return;

    }


    const pesoTotal =

        estado.filamentos.reduce(

            (total, item) =>

                total +

                numero(
                    item.pesoRestante
                ),

            0

        );


    const valorEstoque =

        estado.filamentos.reduce(

            (total, item) =>

                total +

                (
                    numero(
                        item.pesoRestante
                    )

                    *

                    custoGrama(item)

                ),

            0

        );


    $("#total-filamentos")
        .textContent =
        estado.filamentos.length;


    $("#peso-filamentos")
        .textContent =

        (
            pesoTotal /
            1000
        )

        .toLocaleString(

            "pt-BR",

            {
                maximumFractionDigits: 2
            }

        )

        +

        " kg";


    $("#valor-filamentos")
        .textContent =
        dinheiro(
            valorEstoque
        );


    $("#filamentos-baixos")
        .textContent =

        estado.filamentos

            .filter(
                filamentoBaixo
            )

            .length;


    atualizarFiltroMateriais();


    const pesquisa =

        (
            $("#buscar-filamento")
                ?.value || ""
        )

        .toLowerCase();


    const filtro =

        $("#filtro-material")
            ?.value ||
        "Todos";


    const lista =

        estado.filamentos.filter(

            item => {

                const texto =

                    `${item.marca} ${item.material} ${item.cor}`

                    .toLowerCase();


                return (

                    texto.includes(
                        pesquisa
                    )

                    &&

                    (
                        filtro === "Todos" ||

                        item.material ===
                        filtro
                    )

                );

            }

        );


    if (!lista.length) {

        $("#tabela-filamentos")
            .innerHTML = `

                <tr>

                    <td colspan="7">

                        Nenhum filamento cadastrado.

                    </td>

                </tr>

            `;


        renderizarSimulador();

        return;

    }


    $("#tabela-filamentos")
        .innerHTML =

        lista.map(

            item => {

                const restante =
                    numero(
                        item.pesoRestante
                    );


                const original =

                    Math.max(

                        1,

                        numero(
                            item.pesoOriginal
                        )

                    );


                const percentual =

                    Math.max(

                        0,

                        Math.min(

                            100,

                            restante /
                            original *
                            100

                        )

                    );


                return `

                    <tr>

                        <td>

                            <strong>

                                ${escaparHTML(
                                    item.marca
                                )}

                            </strong>

                            <small>

                                ${numero(
                                    item.diametro
                                )}
                                mm

                            </small>

                        </td>

                        <td>

                            ${escaparHTML(
                                item.material
                            )}

                        </td>

                        <td>

                            ${escaparHTML(
                                item.cor
                            )}

                        </td>

                        <td>

                            ${restante}
                            g

                            <div
                                class="barra-estoque"
                            >

                                <span
                                    style="
                                        width:
                                        ${percentual}%;
                                    "
                                ></span>

                            </div>

                        </td>

                        <td>

                            ${dinheiro(
                                custoGrama(item)
                            )}

                        </td>

                        <td>

                            <span class="${
                                filamentoBaixo(item)
                                    ? "estoque-baixo"
                                    : "estoque-ok"
                            }">

                                ${
                                    filamentoBaixo(item)
                                        ? "Baixo"
                                        : "OK"
                                }

                            </span>

                        </td>

                        <td>

                            <button
                                type="button"
                                class="botao-pequeno"
                                data-filamento-editar="${escaparHTML(
                                    item.id
                                )}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="botao-pequeno botao-excluir"
                                data-filamento-excluir="${escaparHTML(
                                    item.id
                                )}"
                            >
                                Excluir
                            </button>

                        </td>

                    </tr>

                `;

            }

        ).join("");


    renderizarSimulador();

}


function abrirNovoFilamento() {

    estado.filamentoEditando =
        null;


    const form =
        $("#form-filamento");


    form.reset();


    form.elements.diametro.value =
        1.75;


    form.elements.pesoOriginal.value =
        1000;


    form.elements.pesoRestante.value =
        1000;


    form.elements.limiteBaixo.value =
        200;


    $("#titulo-modal-filamento")
        .textContent =
        "Novo filamento";


    $("#modal-filamento")
        .showModal();

}


function editarFilamento(id) {

    const item =

        estado.filamentos.find(

            filamento =>

                String(
                    filamento.id
                ) ===
                String(id)

        );


    if (!item) {

        return;

    }


    estado.filamentoEditando =
        item.id;


    const campos =
        $("#form-filamento")
            .elements;


    campos.marca.value =
        item.marca || "";


    campos.material.value =
        item.material || "";


    campos.cor.value =
        item.cor || "";


    campos.diametro.value =
        numero(
            item.diametro
        ) || 1.75;


    campos.pesoOriginal.value =
        numero(
            item.pesoOriginal
        );


    campos.pesoRestante.value =
        numero(
            item.pesoRestante
        );


    campos.valorPago.value =
        numero(
            item.valorPago
        );


    campos.limiteBaixo.value =
        numero(
            item.limiteBaixo
        );


    campos.observacoes.value =
        item.observacoes || "";


    $("#titulo-modal-filamento")
        .textContent =
        "Editar filamento";


    $("#modal-filamento")
        .showModal();

}


function salvarFilamentoEvento(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
            .elements;


    const anterior =

        estado.filamentos.find(

            item =>

                String(item.id) ===

                String(
                    estado.filamentoEditando
                )

        );


    const item = {

        ...(anterior || {}),

        id:

            anterior?.id ||
            criarID(),

        marca:

            campos.marca
                .value
                .trim(),

        material:

            campos.material
                .value
                .trim(),

        cor:

            campos.cor
                .value
                .trim(),

        diametro:

            numero(
                campos.diametro.value
            ),

        pesoOriginal:

            numero(
                campos.pesoOriginal.value
            ),

        pesoRestante:

            numero(
                campos.pesoRestante.value
            ),

        valorPago:

            numero(
                campos.valorPago.value
            ),

        limiteBaixo:

            numero(
                campos.limiteBaixo.value
            ),

        observacoes:

            campos.observacoes
                .value
                .trim(),

        atualizado_em:
            agoraISO()

    };


    if (

        !item.marca ||
        !item.material ||
        !item.cor

    ) {

        avisar(

            "Informe marca, material e cor.",

            true

        );

        return;

    }


    if (

        item.pesoOriginal <= 0 ||

        item.pesoRestante < 0

    ) {

        avisar(

            "Confira os pesos informados.",

            true

        );

        return;

    }


    if (

        item.pesoRestante >
        item.pesoOriginal

    ) {

        avisar(

            "O peso restante não pode " +

            "ser maior que o peso original.",

            true

        );

        return;

    }


    if (anterior) {

        estado.filamentos =

            estado.filamentos.map(

                filamento =>

                    String(
                        filamento.id
                    ) ===
                    String(anterior.id)

                        ? item

                        : filamento

            );

    } else {

        estado.filamentos.push(
            item
        );

    }


    salvarFilamentos();


    estado.filamentoEditando =
        null;


    $("#modal-filamento")
        .close();


    avisar(
        "Filamento salvo."
    );

}


function excluirFilamento(id) {

    if (

        !confirm(
            "Excluir este filamento?"
        )

    ) {

        return;

    }


    estado.filamentos =

        estado.filamentos.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    salvarFilamentos();

}


/* =====================================================
   SIMULADOR
===================================================== */

function renderizarSimulador() {

    const select =
        $("#sim-filamento");


    if (!select) {

        return;

    }


    const atual =
        select.value;


    select.innerHTML = `

        <option value="">

            Selecione

        </option>

        ${

            estado.filamentos.map(

                item => `

                    <option
                        value="${escaparHTML(
                            item.id
                        )}"
                    >

                        ${escaparHTML(
                            item.material
                        )}
                        -
                        ${escaparHTML(
                            item.cor
                        )}

                    </option>

                `

            ).join("")

        }

    `;


    if (

        estado.filamentos.some(

            item =>

                String(item.id) ===
                String(atual)

        )

    ) {

        select.value =
            atual;

    }


    calcularSimulador();

}


function calcularSimulador() {

    const id =
        $("#sim-filamento")
            ?.value;


    const filamento =

        estado.filamentos.find(

            item =>

                String(item.id) ===
                String(id)

        );


    const gramas =
        numero(
            $("#sim-gramas")
                ?.value
        );


    const horas =
        numero(
            $("#sim-horas")
                ?.value
        );


    const potencia =
        numero(
            $("#sim-potencia")
                ?.value
        );


    const tarifa =
        numero(
            $("#sim-energia")
                ?.value
        );


    const acrescimo =
        numero(
            $("#sim-margem")
                ?.value
        );


    const material =

        filamento

            ? gramas *
                custoGrama(
                    filamento
                )

            : 0;


    const energia =

        (
            potencia /
            1000
        )

        *

        horas

        *

        tarifa;


    const direto =
        material +
        energia;


    const calculado =

        direto *

        (
            1 +
            acrescimo /
            100
        );


    $("#sim-custo-material")
        .textContent =
        dinheiro(material);


    $("#sim-custo-energia")
        .textContent =
        dinheiro(energia);


    $("#sim-custo-direto")
        .textContent =
        dinheiro(direto);


    $("#sim-preco-sugerido")
        .textContent =
        dinheiro(calculado);

}


/* =====================================================
   ATUALIZAR PAINEL
===================================================== */

function atualizarPainel() {

    atualizarIndicadores();

    renderizarRecentes();

    renderizarProdutos();

    renderizarPedidos();

    renderizarCustos();

    renderizarFilamentos();


    if ($("#data-atual")) {

        $("#data-atual")
            .textContent =

            new Date()

            .toLocaleDateString(

                "pt-BR",

                {

                    day: "2-digit",

                    month: "long",

                    year: "numeric"

                }

            );

    }

}


/* =====================================================
   EXPORTAÇÃO
===================================================== */

function baixarArquivo(

    nome,

    conteudo,

    tipo

) {

    const blob =
        new Blob(

            [conteudo],

            {
                type: tipo
            }

        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        nome;


    document.body
        .appendChild(
            link
        );


    link.click();

    link.remove();


    setTimeout(

        () =>
            URL.revokeObjectURL(
                url
            ),

        1000

    );

}


function campoCSV(valor) {

    let texto =
        String(valor ?? "");


    if (

        /^[\s]*[=+\-@]/
        .test(texto)

    ) {

        texto =
            "'" + texto;

    }


    return (

        '"' +

        texto.replaceAll(
            '"',
            '""'
        )

        +

        '"'

    );

}


function exportarCSV(

    nome,

    cabecalho,

    linhas

) {

    const conteudo = [

        cabecalho
            .map(campoCSV)
            .join(";"),

        ...linhas.map(

            linha =>

                linha
                .map(campoCSV)
                .join(";")

        )

    ].join("\r\n");


    baixarArquivo(

        nome,

        "\uFEFF" +
        conteudo,

        "text/csv;charset=utf-8"

    );

}


/* =====================================================
   BACKUP
===================================================== */

function exportarBackup() {

    baixarArquivo(

        "backup-criaitor3d.json",

        JSON.stringify(

            {

                data:
                    agoraISO(),

                produtos:
                    estado.produtos,

                pedidos:
                    estado.pedidos,

                custos:
                    estado.custos,

                filamentos:
                    estado.filamentos

            },

            null,

            2

        ),

        "application/json"

    );

}


async function restaurarBackup(
    evento
) {

    const arquivo =
        evento.target.files?.[0];


    if (!arquivo) {

        return;

    }


    try {

        const dados =
            JSON.parse(

                await arquivo.text()

            );


        if (

            Array.isArray(
                dados.pedidos
            )

        ) {

            estado.pedidos =
                dados.pedidos;

        }


        if (

            Array.isArray(
                dados.custos
            )

        ) {

            estado.custos =
                dados.custos;

        }


        if (

            Array.isArray(
                dados.filamentos
            )

        ) {

            estado.filamentos =
                dados.filamentos;

        }


        salvarPedidos();

        salvarCustos();

        salvarFilamentos();


        avisar(
            "Backup restaurado."
        );


    } catch {

        avisar(

            "Arquivo de backup inválido.",

            true

        );

    }


    evento.target.value =
        "";

}


/* =====================================================
   EVENTOS
===================================================== */

function configurarEventos() {

    document.addEventListener(

        "click",

        evento => {

            const menu =

                evento.target.closest(
                    "[data-pagina]"
                );


            if (menu) {

                abrirPagina(
                    menu.dataset.pagina
                );

            }


            const ir =

                evento.target.closest(
                    "[data-ir]"
                );


            if (ir) {

                abrirPagina(
                    ir.dataset.ir
                );

            }


            const fechar =

                evento.target.closest(
                    "[data-fechar]"
                );


            if (fechar) {

                document
                    .getElementById(
                        fechar.dataset.fechar
                    )
                    ?.close();

            }


            const editarProdutoBotao =

                evento.target.closest(
                    "[data-produto-editar]"
                );


            if (editarProdutoBotao) {

                editarProduto(

                    editarProdutoBotao.dataset
                        .produtoEditar

                );

            }


            const excluirProdutoBotao =

                evento.target.closest(
                    "[data-produto-excluir]"
                );


            if (excluirProdutoBotao) {

                excluirProduto(

                    excluirProdutoBotao.dataset
                        .produtoExcluir

                );

            }


            const editarPedidoBotao =

                evento.target.closest(
                    "[data-pedido-editar]"
                );


            if (editarPedidoBotao) {

                editarPedido(

                    editarPedidoBotao.dataset
                        .pedidoEditar

                );

            }


            const excluirPedidoBotao =

                evento.target.closest(
                    "[data-pedido-excluir]"
                );


            if (excluirPedidoBotao) {

                excluirPedido(

                    excluirPedidoBotao.dataset
                        .pedidoExcluir

                );

            }


            const editarCustoBotao =

                evento.target.closest(
                    "[data-custo-editar]"
                );


            if (editarCustoBotao) {

                editarCusto(

                    editarCustoBotao.dataset
                        .custoEditar

                );

            }


            const excluirCustoBotao =

                evento.target.closest(
                    "[data-custo-excluir]"
                );


            if (excluirCustoBotao) {

                excluirCusto(

                    excluirCustoBotao.dataset
                        .custoExcluir

                );

            }


            const editarFilamentoBotao =

                evento.target.closest(
                    "[data-filamento-editar]"
                );


            if (editarFilamentoBotao) {

                editarFilamento(

                    editarFilamentoBotao.dataset
                        .filamentoEditar

                );

            }


            const excluirFilamentoBotao =

                evento.target.closest(
                    "[data-filamento-excluir]"
                );


            if (excluirFilamentoBotao) {

                excluirFilamento(

                    excluirFilamentoBotao.dataset
                        .filamentoExcluir

                );

            }

        }

    );


    $("#novo-produto")
        ?.addEventListener(
            "click",
            abrirNovoProduto
        );


    $("#novo-produto-topo")
        ?.addEventListener(
            "click",
            abrirNovoProduto
        );


    $("#novo-pedido")
        ?.addEventListener(
            "click",
            abrirNovoPedido
        );


    $("#novo-custo")
        ?.addEventListener(
            "click",
            abrirNovoCusto
        );


    $("#novo-filamento")
        ?.addEventListener(
            "click",
            abrirNovoFilamento
        );


    $("#form-produto")
        ?.addEventListener(
            "submit",
            salvarProduto
        );


    $("#form-pedido")
        ?.addEventListener(
            "submit",
            salvarPedidoEvento
        );


    $("#form-custo")
        ?.addEventListener(
            "submit",
            salvarCustoEvento
        );


    $("#form-filamento")
        ?.addEventListener(
            "submit",
            salvarFilamentoEvento
        );


    $("#buscar-produto")
        ?.addEventListener(
            "input",
            renderizarProdutos
        );


    $("#buscar-custo")
        ?.addEventListener(
            "input",
            renderizarCustos
        );


    $("#filtro-custo")
        ?.addEventListener(
            "change",
            renderizarCustos
        );


    $("#buscar-filamento")
        ?.addEventListener(
            "input",
            renderizarFilamentos
        );


    $("#filtro-material")
        ?.addEventListener(
            "change",
            renderizarFilamentos
        );


    [

        "#sim-filamento",

        "#sim-gramas",

        "#sim-horas",

        "#sim-potencia",

        "#sim-energia",

        "#sim-margem"

    ].forEach(

        seletor => {

            $(seletor)
                ?.addEventListener(

                    "input",

                    calcularSimulador

                );


            $(seletor)
                ?.addEventListener(

                    "change",

                    calcularSimulador

                );

        }

    );


    $("#exportar-pedidos")
        ?.addEventListener(

            "click",

            () => {

                exportarCSV(

                    "pedidos-criaitor3d.csv",

                    [

                        "Cliente",

                        "Contato",

                        "Produtos",

                        "Valor",

                        "Status",

                        "Data"

                    ],

                    estado.pedidos.map(

                        item => [

                            item.cliente,

                            item.contato,

                            item.itens,

                            item.valor,

                            item.status,

                            item.data

                        ]

                    )

                );

            }

        );


    $("#exportar-custos")
        ?.addEventListener(

            "click",

            () => {

                exportarCSV(

                    "custos-criaitor3d.csv",

                    [

                        "Descrição",

                        "Categoria",

                        "Tipo",

                        "Valor",

                        "Data"

                    ],

                    estado.custos.map(

                        item => [

                            item.descricao,

                            item.categoria,

                            item.tipo,

                            item.valor,

                            item.data

                        ]

                    )

                );

            }

        );


    $("#exportar-filamentos")
        ?.addEventListener(

            "click",

            () => {

                exportarCSV(

                    "filamentos-criaitor3d.csv",

                    [

                        "Marca",

                        "Material",

                        "Cor",

                        "Peso original",

                        "Peso restante",

                        "Valor pago",

                        "Custo por grama"

                    ],

                    estado.filamentos.map(

                        item => [

                            item.marca,

                            item.material,

                            item.cor,

                            item.pesoOriginal,

                            item.pesoRestante,

                            item.valorPago,

                            custoGrama(item)

                        ]

                    )

                );

            }

        );


    $("#exportar-catalogo")
        ?.addEventListener(

            "click",

            () => {

                baixarArquivo(

                    "catalogo.js",

                    "window.CRIAITOR_CATALOGO = " +

                    JSON.stringify(

                        estado.produtos,

                        null,

                        2

                    )

                    +

                    ";\n",

                    "text/javascript"

                );

            }

        );


    $("#baixar-backup")
        ?.addEventListener(
            "click",
            exportarBackup
        );


    $("#restaurar-backup")
        ?.addEventListener(
            "change",
            restaurarBackup
        );

}


/* =====================================================
   VERIFICAR ALTERAÇÕES
===================================================== */

async function verificarAtualizacoes() {

    if (

        estado.salvandoCatalogo ||

        $("#modal-produto")
            ?.open

    ) {

        return;

    }


    try {

        const {

            data,

            error

        } = await sb

            .from(CONFIG.tabela)

            .select("versao")

            .eq(
                "id",
                CONFIG.registro
            )

            .single();


        if (error) {

            return;

        }


        if (

            numero(
                data.versao
            )

            !==

            estado.versao

        ) {

            await carregarCatalogo();

        }


    } catch {

        /* mantém painel funcionando */

    }

}


/* =====================================================
   API
===================================================== */

window.CRIAITOR_ADMIN = {

    recarregar:
        carregarCatalogo,

    atualizar:
        atualizarPainel,

    abrirPagina,

    abrirNovoProduto,

    getProdutos:
        () => [
            ...estado.produtos
        ],

    getVersao:
        () =>
            estado.versao,

    getUsuario:
        () => null,

    getCustos:
        () => [
            ...estado.custos
        ],

    getFilamentos:
        () => [
            ...estado.filamentos
        ]

};


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

async function iniciar() {

    try {

        verificarSupabase();

        carregarDadosLocais();

        configurarEventos();

        abrirPagina(
            "dashboard"
        );


        await carregarCatalogo();


        atualizarPainel();


        setInterval(

            verificarAtualizacoes,

            30000

        );


    } catch (erro) {

        console.error(
            erro
        );


        avisar(

            erro.message,

            true

        );


        atualizarPainel();

    }

}


/* =====================================================
   START
===================================================== */

if (

    document.readyState ===
    "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        iniciar,

        {
            once: true
        }

    );

} else {

    iniciar();

}

})();
