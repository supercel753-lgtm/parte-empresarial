(function () {

"use strict";


const CONFIG = {

    tabela:
        window.CRIAITOR_SUPABASE_CONFIG
            ?.tabelaCatalogo ||
        "catalogo",

    registro:
        window.CRIAITOR_SUPABASE_CONFIG
            ?.registroCatalogo ||
        1

};


const sb =
    window.sb;


const $ =
    seletor =>
        document.querySelector(
            seletor
        );


const $$ =
    seletor =>
        Array.from(
            document.querySelectorAll(
                seletor
            )
        );


const KEYS = {

    pedidos:
        "criaitor3d_pedidos",

    custos:
        "criaitor3d_custos",

    filamentos:
        "criaitor3d_filamentos",

    precConfig:
        "criaitor3d_precificacao_config",

    adicionais:
        "criaitor3d_precificacao_adicionais",

    historico:
        "criaitor3d_precificacao_historico"

};


const CONFIG_PADRAO = {

    energiaKwh:
        1,

    maoObraHora:
        20,

    perdasPct:
        10,

    tributosPct:
        0,

    outrosTributosPct:
        0,

    taxaPagamentoPct:
        0,

    taxaPagamentoFixa:
        0,

    margemPct:
        40,

    impressoraValor:
        2500,

    impressoraVidaHoras:
        5000,

    canais: {

        direta:
            0,

        site:
            0,

        mercado_livre:
            0,

        shopee:
            0,

        consignacao:
            0,

        personalizado:
            0

    }

};


const ADICIONAIS_PADRAO = [

    {
        id:
            "argola-chaveiro",

        nome:
            "Argola de chaveiro",

        custo:
            0
    },

    {
        id:
            "saquinho",

        nome:
            "Saquinho / embalagem simples",

        custo:
            0
    },

    {
        id:
            "etiqueta",

        nome:
            "Etiqueta",

        custo:
            0
    },

    {
        id:
            "caixa",

        nome:
            "Caixa",

        custo:
            0
    },

    {
        id:
            "papel-bolha",

        nome:
            "Papel bolha",

        custo:
            0
    }

];


const estado = {

    produtos:
        [],

    versao:
        0,

    salvandoCatalogo:
        false,

    pedidos:
        [],

    custos:
        [],

    filamentos:
        [],

    precConfig:
        copiar(
            CONFIG_PADRAO
        ),

    adicionais:
        [],

    historico:
        [],

    produtoEditando:
        null,

    pedidoEditando:
        null,

    custoEditando:
        null,

    filamentoEditando:
        null,

    ultimoCalculo:
        null

};


function copiar(objeto) {

    return JSON.parse(
        JSON.stringify(
            objeto
        )
    );

}


function numero(valor) {

    const n =
        Number(valor);

    return Number.isFinite(n)
        ? n
        : 0;

}


function dinheiro(valor) {

    return new Intl.NumberFormat(

        "pt-BR",

        {
            style:
                "currency",

            currency:
                "BRL"
        }

    ).format(
        numero(valor)
    );

}


function esc(valor) {

    return String(
        valor ?? ""
    )

    .replaceAll(
        "&",
        "&amp;"
    )

    .replaceAll(
        "<",
        "&lt;"
    )

    .replaceAll(
        ">",
        "&gt;"
    )

    .replaceAll(
        '"',
        "&quot;"
    )

    .replaceAll(
        "'",
        "&#39;"
    );

}


function criarID() {

    if (

        window.crypto &&
        crypto.randomUUID

    ) {

        return crypto.randomUUID();

    }


    return (

        Date.now()
            .toString(36)

        +

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
        .slice(
            0,
            10
        );

}


function formatarData(valor) {

    if (!valor) {

        return "—";

    }


    const data =

        String(valor).length === 10

            ? new Date(
                valor +
                "T12:00:00"
            )

            : new Date(
                valor
            );


    if (

        Number.isNaN(
            data.getTime()
        )

    ) {

        return "—";

    }


    return data.toLocaleString(
        "pt-BR"
    );

}


function lerLocal(

    chave,

    fallback

) {

    try {

        const bruto =
            localStorage.getItem(
                chave
            );


        return bruto

            ? JSON.parse(
                bruto
            )

            : copiar(
                fallback
            );


    } catch {

        return copiar(
            fallback
        );

    }

}


function salvarLocal(

    chave,

    valor

) {

    localStorage.setItem(

        chave,

        JSON.stringify(
            valor
        )

    );

}


/* AVISOS */

let timerAviso;


function avisar(

    mensagem,

    erro = false

) {

    const elemento =
        $("#notificacao");


    if (!elemento) {

        console.log(
            mensagem
        );

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


/* LOCAL */

function carregarLocais() {

    estado.pedidos =
        lerLocal(
            KEYS.pedidos,
            []
        );


    estado.custos =
        lerLocal(
            KEYS.custos,
            []
        );


    estado.filamentos =
        lerLocal(
            KEYS.filamentos,
            []
        );


    estado.precConfig = {

        ...copiar(
            CONFIG_PADRAO
        ),

        ...lerLocal(
            KEYS.precConfig,
            CONFIG_PADRAO
        )

    };


    estado.precConfig.canais = {

        ...CONFIG_PADRAO.canais,

        ...(
            estado.precConfig
                .canais ||
            {}
        )

    };


    estado.adicionais =
        lerLocal(

            KEYS.adicionais,

            ADICIONAIS_PADRAO

        );


    estado.historico =
        lerLocal(

            KEYS.historico,

            []

        );


    migrarCodigosFilamentos();

}


function migrarCodigosFilamentos() {

    const usados =
        new Set(

            estado.filamentos

            .map(

                filamento =>
                    String(
                        filamento.codigo ||
                        ""
                    ).trim()

            )

            .filter(Boolean)

        );


    let mudou =
        false;


    for (

        const filamento
        of estado.filamentos

    ) {

        if (!filamento.codigo) {

            let numeroCodigo =
                1;

            let codigo;


            do {

                codigo =
                    String(
                        numeroCodigo++
                    )
                    .padStart(
                        3,
                        "0"
                    );

            } while (

                usados.has(
                    codigo
                )

            );


            filamento.codigo =
                codigo;


            usados.add(
                codigo
            );


            mudou =
                true;

        }

    }


    if (mudou) {

        salvarFilamentosLocal(
            false
        );

    }

}


/* SUPABASE */

async function carregarCatalogo() {

    if (!sb) {

        throw new Error(
            "Supabase não inicializado."
        );

    }


    const {
        data,
        error
    } = await sb

        .from(
            CONFIG.tabela
        )

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


async function salvarCatalogo(
    produtos
) {

    if (

        estado.salvandoCatalogo

    ) {

        throw new Error(
            "Salvamento em andamento."
        );

    }


    estado.salvandoCatalogo =
        true;


    try {

        const novaVersao =
            estado.versao +
            1;


        const {
            data,
            error
        } = await sb

            .from(
                CONFIG.tabela
            )

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

                "O catálogo foi alterado em outra sessão. " +

                "Recarregue a página."

            );

        }


        estado.produtos =

            Array.isArray(
                data[0].produtos
            )

                ? data[0].produtos

                : [];


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


/* NAVEGAÇÃO */

function abrirPagina(
    nome
) {

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

                    botao.dataset
                        .pagina ===
                    nome

                );

            }

        );


    const titulos = {

        dashboard:
            "Visão geral",

        produtos:
            "Produtos",

        pedidos:
            "Pedidos",

        precificacao:
            "Precificação",

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

            titulos[nome] ||
            nome;

    }


    if (

        nome ===
        "precificacao"

    ) {

        renderizarPrecificacao();

    }

}


/* SALVAMENTOS LOCAIS */

function salvarPedidosLocal() {

    salvarLocal(

        KEYS.pedidos,

        estado.pedidos

    );


    atualizarPainel();

}


function salvarCustosLocal() {

    salvarLocal(

        KEYS.custos,

        estado.custos

    );


    atualizarPainel();

}


function salvarFilamentosLocal(
    atualizar = true
) {

    salvarLocal(

        KEYS.filamentos,

        estado.filamentos

    );


    if (atualizar) {

        atualizarPainel();

    }

}


function salvarPrecConfig() {

    salvarLocal(

        KEYS.precConfig,

        estado.precConfig

    );

}


function salvarAdicionais() {

    salvarLocal(

        KEYS.adicionais,

        estado.adicionais

    );


    renderizarAdicionais();

    calcularPrecificacao();

}


function salvarHistorico() {

    salvarLocal(

        KEYS.historico,

        estado.historico

    );


    renderizarHistorico();

}


/* DASHBOARD */

function atualizarIndicadores() {

    $("#total-produtos")
        .textContent =
        estado.produtos.length;


    $("#total-visiveis")
        .textContent =

        estado.produtos

        .filter(

            produto =>

                produto.disponivel !==
                false

        )

        .length;


    $("#total-estoque")
        .textContent =

        estado.produtos

        .reduce(

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


    $("#total-pedidos")
        .textContent =

        estado.pedidos

        .filter(

            pedido =>

                ![
                    "Entregue",
                    "Cancelado"
                ]

                .includes(
                    pedido.status
                )

        )

        .length;

}


function renderizarRecentes() {

    const elemento =
        $("#produtos-recentes");


    if (!elemento) {

        return;

    }


    const lista =

        estado.produtos

        .slice(
            -5
        )

        .reverse();


    elemento.innerHTML =

        lista.length

            ? lista.map(

                produto => `

                    <div class="produto-recente">

                        ${
                            produto.imagem

                            ? `

                                <img
                                    src="${esc(
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

                                ${esc(
                                    produto.nome
                                )}

                            </strong>

                            <span>

                                ${esc(
                                    produto.categoria ||
                                    ""
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

            ).join("")

            : `

                <p>
                    Nenhum produto cadastrado.
                </p>

            `;

}


/* PRODUTOS */

function renderizarProdutos() {

    const tabela =
        $("#tabela-produtos");


    if (!tabela) {

        return;

    }


    const busca =

        (
            $("#buscar-produto")
                ?.value ||
            ""
        )

        .toLowerCase();


    const lista =

        estado.produtos

        .filter(

            produto =>

                `${
                    produto.nome ||
                    ""
                } ${
                    produto.categoria ||
                    ""
                }`

                .toLowerCase()

                .includes(
                    busca
                )

        );


    $("#contador-produtos")
        .textContent =

        `${lista.length} produto${
            lista.length === 1
                ? ""
                : "s"
        }`;


    tabela.innerHTML =

        lista.length

        ? lista.map(

            produto => `

                <tr>

                    <td>

                        <strong>

                            ${esc(
                                produto.nome
                            )}

                        </strong>

                        <small>

                            ${esc(
                                produto.prazo ||
                                ""
                            )}

                        </small>

                    </td>

                    <td>

                        ${esc(
                            produto.categoria ||
                            ""
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

                        <span
                            class="${
                                produto.disponivel !== false
                                    ? "visivel"
                                    : "oculto"
                            }"
                        >

                            ${
                                produto.disponivel !== false
                                    ? "Visível"
                                    : "Oculto"
                            }

                        </span>

                    </td>

                    <td>

                        <button
                            class="botao-pequeno"
                            data-produto-editar="${esc(
                                produto.id
                            )}"
                        >

                            Editar

                        </button>

                        <button
                            class="botao-pequeno botao-excluir"
                            data-produto-excluir="${esc(
                                produto.id
                            )}"
                        >

                            Excluir

                        </button>

                    </td>

                </tr>

            `

        ).join("")

        : `

            <tr>

                <td colspan="6">
                    Nenhum produto cadastrado.
                </td>

            </tr>

        `;

}


function abrirNovoProduto() {

    estado.produtoEditando =
        null;


    const form =
        $("#form-produto");


    form.reset();


    form.elements
        .estoque
        .value =
        0;


    form.elements
        .prazo
        .value =
        "Produção sob encomenda";


    form.elements
        .disponivel
        .checked =
        true;


    form.elements
        .imagem
        .value =
        "";


    form.elements
        .imagem
        .dispatchEvent(
            new Event(
                "change"
            )
        );


    $("#titulo-modal-produto")
        .textContent =
        "Novo produto";


    $("#modal-produto")
        .showModal();

}


function editarProduto(
    id
) {

    const produto =

        estado.produtos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    id
                )

        );


    if (!produto) {

        return;

    }


    estado.produtoEditando =
        produto.id;


    const campos =
        $("#form-produto")
        .elements;


    campos.nome.value =
        produto.nome ||
        "";


    campos.categoria.value =
        produto.categoria ||
        "";


    campos.preco.value =
        numero(
            produto.preco
        );


    campos.estoque.value =
        numero(
            produto.estoque
        );


    campos.prazo.value =
        produto.prazo ||
        "";


    campos.imagem.value =
        produto.imagem ||
        "";


    campos.descricao.value =
        produto.descricao ||
        "";


    campos.disponivel.checked =
        produto.disponivel !==
        false;


    campos.destaque.checked =
        produto.destaque ===
        true;


    campos.imagem
        .dispatchEvent(
            new Event(
                "change"
            )
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


    const campos =
        evento.currentTarget
        .elements;


    const anterior =

        estado.produtos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    estado.produtoEditando
                )

        );


    const produto = {

        ...(
            anterior ||
            {}
        ),

        id:

            anterior?.id ||
            criarID(),

        nome:

            campos.nome
                .value
                .trim(),

        categoria:

            campos.categoria
                .value
                .trim(),

        preco:

            numero(
                campos.preco.value
            ),

        estoque:

            Math.max(

                0,

                Math.trunc(

                    numero(
                        campos.estoque
                            .value
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


    if (

        !produto.nome ||
        !produto.categoria

    ) {

        avisar(

            "Informe nome e categoria.",

            true

        );

        return;

    }


    const lista =

        anterior

        ? estado.produtos.map(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    anterior.id
                )

                ? produto

                : item

        )

        : [
            ...estado.produtos,
            produto
        ];


    try {

        await salvarCatalogo(
            lista
        );


        estado.produtoEditando =
            null;


        $("#modal-produto")
            .close();


        avisar(
            "Produto salvo."
        );


    } catch (
        erro
    ) {

        avisar(

            erro.message,

            true

        );

    }

}


async function excluirProduto(
    id
) {

    const produto =

        estado.produtos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    id
                )

        );


    if (

        !produto ||

        !confirm(
            `Excluir "${produto.nome}"?`
        )

    ) {

        return;

    }


    try {

        await salvarCatalogo(

            estado.produtos

            .filter(

                item =>

                    String(
                        item.id
                    )

                    !==

                    String(
                        id
                    )

            )

        );


        avisar(
            "Produto excluído."
        );


    } catch (
        erro
    ) {

        avisar(

            erro.message,

            true

        );

    }

}


/* PEDIDOS */

function renderizarPedidos() {

    const tabela =
        $("#tabela-pedidos");


    if (!tabela) {

        return;

    }


    tabela.innerHTML =

        estado.pedidos.length

        ? [
            ...estado.pedidos
        ]

        .reverse()

        .map(

            pedido => `

                <tr>

                    <td>

                        <strong>

                            ${esc(
                                pedido.cliente
                            )}

                        </strong>

                        <small>

                            ${esc(
                                pedido.contato ||
                                ""
                            )}

                        </small>

                    </td>

                    <td>
                        ${esc(
                            pedido.itens
                        )}
                    </td>

                    <td>
                        ${dinheiro(
                            pedido.valor
                        )}
                    </td>

                    <td>
                        ${esc(
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
                            class="botao-pequeno"
                            data-pedido-editar="${esc(
                                pedido.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            class="botao-pequeno botao-excluir"
                            data-pedido-excluir="${esc(
                                pedido.id
                            )}"
                        >
                            Excluir
                        </button>

                    </td>

                </tr>

            `

        ).join("")

        : `

            <tr>
                <td colspan="6">
                    Nenhum pedido registrado.
                </td>
            </tr>

        `;

}


function abrirNovoPedido() {

    estado.pedidoEditando =
        null;


    $("#form-pedido")
        .reset();


    $("#modal-pedido")
        .showModal();

}


function editarPedido(
    id
) {

    const pedido =

        estado.pedidos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    id
                )

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
        pedido.cliente ||
        "";


    campos.contato.value =
        pedido.contato ||
        "";


    campos.itens.value =
        pedido.itens ||
        "";


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


function salvarPedido(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
        .elements;


    const anterior =

        estado.pedidos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    estado.pedidoEditando
                )

        );


    const pedido = {

        ...(
            anterior ||
            {}
        ),

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


    estado.pedidos =

        anterior

        ? estado.pedidos.map(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    anterior.id
                )

                ? pedido

                : item

        )

        : [
            ...estado.pedidos,
            pedido
        ];


    salvarPedidosLocal();


    estado.pedidoEditando =
        null;


    $("#modal-pedido")
        .close();


    avisar(
        "Pedido salvo."
    );

}


function excluirPedido(
    id
) {

    if (

        !confirm(
            "Excluir este pedido?"
        )

    ) {

        return;

    }


    estado.pedidos =

        estado.pedidos

        .filter(

            item =>

                String(
                    item.id
                )

                !==

                String(
                    id
                )

        );


    salvarPedidosLocal();

}


/* CUSTOS */

function renderizarCustos() {

    const tabela =
        $("#tabela-custos");


    if (!tabela) {

        return;

    }


    const hoje =
        new Date();


    const mes =

        estado.custos

        .filter(

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


    const somar =
        lista =>

            lista.reduce(

                (
                    total,
                    item
                ) =>

                    total +

                    numero(
                        item.valor
                    ),

                0

            );


    $("#custos-mes")
        .textContent =
        dinheiro(
            somar(
                mes
            )
        );


    $("#custos-fixos")
        .textContent =
        dinheiro(

            somar(

                mes.filter(

                    item =>
                        item.tipo ===
                        "Fixo"

                )

            )

        );


    $("#custos-variaveis")
        .textContent =
        dinheiro(

            somar(

                mes.filter(

                    item =>
                        item.tipo ===
                        "Variável"

                )

            )

        );


    $("#total-custos")
        .textContent =
        estado.custos.length;


    const busca =

        (
            $("#buscar-custo")
                ?.value ||
            ""
        )

        .toLowerCase();


    const filtro =

        $("#filtro-custo")
            ?.value ||
        "Todos";


    const lista =

        [
            ...estado.custos
        ]

        .filter(

            item => {

                const texto =

                    `${
                        item.descricao ||
                        ""
                    } ${
                        item.categoria ||
                        ""
                    }`

                    .toLowerCase();


                return (

                    texto.includes(
                        busca
                    )

                    &&

                    (
                        filtro ===
                        "Todos"

                        ||

                        item.tipo ===
                        filtro
                    )

                );

            }

        )

        .sort(

            (
                a,
                b
            ) =>

                String(
                    b.data
                )

                .localeCompare(
                    String(
                        a.data
                    )
                )

        );


    tabela.innerHTML =

        lista.length

        ? lista.map(

            item => `

                <tr>

                    <td>
                        ${esc(
                            item.descricao
                        )}
                    </td>

                    <td>
                        ${esc(
                            item.categoria
                        )}
                    </td>

                    <td>
                        ${esc(
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
                            class="botao-pequeno"
                            data-custo-editar="${esc(
                                item.id
                            )}"
                        >
                            Editar
                        </button>

                        <button
                            class="botao-pequeno botao-excluir"
                            data-custo-excluir="${esc(
                                item.id
                            )}"
                        >
                            Excluir
                        </button>

                    </td>

                </tr>

            `

        ).join("")

        : `

            <tr>
                <td colspan="6">
                    Nenhum custo cadastrado.
                </td>
            </tr>

        `;

}


function abrirNovoCusto() {

    estado.custoEditando =
        null;


    const form =
        $("#form-custo");


    form.reset();


    form.elements
        .data
        .value =
        dataHoje();


    $("#titulo-modal-custo")
        .textContent =
        "Novo custo";


    $("#modal-custo")
        .showModal();

}


function editarCusto(
    id
) {

    const custo =

        estado.custos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    id
                )

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
        custo.descricao ||
        "";


    campos.categoria.value =
        custo.categoria ||
        "";


    campos.tipo.value =
        custo.tipo ||
        "Variável";


    campos.valor.value =
        numero(
            custo.valor
        );


    campos.data.value =
        custo.data ||
        dataHoje();


    campos.observacoes.value =
        custo.observacoes ||
        "";


    $("#titulo-modal-custo")
        .textContent =
        "Editar custo";


    $("#modal-custo")
        .showModal();

}


function salvarCusto(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
        .elements;


    const anterior =

        estado.custos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    estado.custoEditando
                )

        );


    const custo = {

        ...(
            anterior ||
            {}
        ),

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


    estado.custos =

        anterior

        ? estado.custos.map(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    anterior.id
                )

                ? custo

                : item

        )

        : [
            ...estado.custos,
            custo
        ];


    salvarCustosLocal();


    estado.custoEditando =
        null;


    $("#modal-custo")
        .close();


    avisar(
        "Custo salvo."
    );

}


function excluirCusto(
    id
) {

    if (

        !confirm(
            "Excluir este custo?"
        )

    ) {

        return;

    }


    estado.custos =

        estado.custos

        .filter(

            item =>

                String(
                    item.id
                )

                !==

                String(
                    id
                )

        );


    salvarCustosLocal();

}


/* FILAMENTOS */

function custoGrama(
    filamento
) {

    const peso =
        numero(
            filamento.pesoOriginal
        );


    return peso > 0

        ? numero(
            filamento.valorPago
        ) / peso

        : 0;

}


function proximoCodigoFilamento() {

    const numeros =

        estado.filamentos

        .map(

            filamento =>
                parseInt(
                    filamento.codigo,
                    10
                )

        )

        .filter(
            Number.isFinite
        );


    return String(

        (
            numeros.length

            ? Math.max(
                ...numeros
            )

            : 0
        )

        + 1

    )

    .padStart(
        3,
        "0"
    );

}


function renderizarFilamentos() {

    const tabela =
        $("#tabela-filamentos");


    if (!tabela) {

        return;

    }


    const peso =

        estado.filamentos

        .reduce(

            (
                total,
                filamento
            ) =>

                total +

                numero(
                    filamento.pesoRestante
                ),

            0

        );


    const valor =

        estado.filamentos

        .reduce(

            (
                total,
                filamento
            ) =>

                total +

                (
                    numero(
                        filamento.pesoRestante
                    )

                    *

                    custoGrama(
                        filamento
                    )
                ),

            0

        );


    $("#total-filamentos")
        .textContent =
        estado.filamentos.length;


    $("#peso-filamentos")
        .textContent =

        (
            peso /
            1000
        )

        .toLocaleString(

            "pt-BR",

            {
                maximumFractionDigits:
                    2
            }

        )

        +

        " kg";


    $("#valor-filamentos")
        .textContent =
        dinheiro(
            valor
        );


    $("#filamentos-baixos")
        .textContent =

        estado.filamentos

        .filter(

            filamento =>

                numero(
                    filamento.pesoRestante
                )

                <=

                numero(
                    filamento.limiteBaixo
                )

        )

        .length;


    const busca =

        (
            $("#buscar-filamento")
                ?.value ||
            ""
        )

        .toLowerCase();


    const filtro =

        $("#filtro-material")
            ?.value ||
        "Todos";


    atualizarFiltroMateriais();


    const lista =

        estado.filamentos

        .filter(

            filamento =>

                `${
                    filamento.codigo ||
                    ""
                } ${
                    filamento.marca ||
                    ""
                } ${
                    filamento.material ||
                    ""
                } ${
                    filamento.cor ||
                    ""
                }`

                .toLowerCase()

                .includes(
                    busca
                )

                &&

                (
                    filtro ===
                    "Todos"

                    ||

                    filamento.material ===
                    filtro
                )

        );


    tabela.innerHTML =

        lista.length

        ? lista.map(

            filamento => {

                const consumido =

                    Math.max(

                        0,

                        numero(
                            filamento.pesoOriginal
                        )

                        -

                        numero(
                            filamento.pesoRestante
                        )

                    );


                const baixo =

                    numero(
                        filamento.pesoRestante
                    )

                    <=

                    numero(
                        filamento.limiteBaixo
                    );


                return `

                    <tr>

                        <td>

                            <strong>
                                ${esc(
                                    filamento.codigo
                                )}
                            </strong>

                        </td>

                        <td>

                            <strong>

                                ${esc(
                                    filamento.marca
                                )}

                            </strong>

                            <small>

                                ${esc(
                                    filamento.material
                                )}

                                •

                                ${
                                    numero(
                                        filamento.diametro
                                    ) ||
                                    1.75
                                }

                                mm

                            </small>

                        </td>

                        <td>

                            ${esc(
                                filamento.cor
                            )}

                        </td>

                        <td>

                            ${
                                numero(
                                    filamento.pesoRestante
                                )
                            }

                            g

                        </td>

                        <td>

                            ${
                                consumido.toFixed(
                                    1
                                )
                            }

                            g

                        </td>

                        <td>

                            ${dinheiro(
                                custoGrama(
                                    filamento
                                )
                            )}

                        </td>

                        <td>

                            <span
                                class="${
                                    baixo
                                        ? "estoque-baixo"
                                        : "estoque-ok"
                                }"
                            >

                                ${
                                    baixo
                                        ? "Baixo"
                                        : "OK"
                                }

                            </span>

                        </td>

                        <td>

                            <button
                                class="botao-pequeno"
                                data-filamento-editar="${esc(
                                    filamento.id
                                )}"
                            >

                                Editar

                            </button>

                            <button
                                class="botao-pequeno botao-excluir"
                                data-filamento-excluir="${esc(
                                    filamento.id
                                )}"
                            >

                                Excluir

                            </button>

                        </td>

                    </tr>

                `;

            }

        ).join("")

        : `

            <tr>

                <td colspan="8">
                    Nenhum filamento cadastrado.
                </td>

            </tr>

        `;


    preencherSelectsFilamentos();

}


function atualizarFiltroMateriais() {

    const select =
        $("#filtro-material");


    if (!select) {

        return;

    }


    const atual =
        select.value;


    const materiais =

        [
            ...new Set(

                estado.filamentos

                .map(
                    filamento =>
                        filamento.material
                )

                .filter(Boolean)

            )
        ]

        .sort();


    select.innerHTML = `

        <option value="Todos">
            Todos os materiais
        </option>

        ${

            materiais.map(

                material => `

                    <option value="${esc(
                        material
                    )}">

                        ${esc(
                            material
                        )}

                    </option>

                `

            ).join("")

        }

    `;


    if (

        materiais.includes(
            atual
        )

    ) {

        select.value =
            atual;

    }

}


function abrirNovoFilamento() {

    estado.filamentoEditando =
        null;


    const form =
        $("#form-filamento");


    form.reset();


    form.elements
        .codigo
        .value =
        proximoCodigoFilamento();


    form.elements
        .diametro
        .value =
        1.75;


    form.elements
        .pesoOriginal
        .value =
        1000;


    form.elements
        .pesoRestante
        .value =
        1000;


    form.elements
        .limiteBaixo
        .value =
        200;


    $("#titulo-modal-filamento")
        .textContent =
        "Novo filamento";


    $("#modal-filamento")
        .showModal();

}


function editarFilamento(
    id
) {

    const filamento =

        estado.filamentos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    id
                )

        );


    if (!filamento) {

        return;

    }


    estado.filamentoEditando =
        filamento.id;


    const campos =
        $("#form-filamento")
        .elements;


    campos.codigo.value =
        filamento.codigo ||
        "";


    campos.marca.value =
        filamento.marca ||
        "";


    campos.material.value =
        filamento.material ||
        "";


    campos.cor.value =
        filamento.cor ||
        "";


    campos.diametro.value =
        numero(
            filamento.diametro
        ) ||
        1.75;


    campos.pesoOriginal.value =
        numero(
            filamento.pesoOriginal
        );


    campos.pesoRestante.value =
        numero(
            filamento.pesoRestante
        );


    campos.valorPago.value =
        numero(
            filamento.valorPago
        );


    campos.limiteBaixo.value =
        numero(
            filamento.limiteBaixo
        );


    campos.observacoes.value =
        filamento.observacoes ||
        "";


    $("#titulo-modal-filamento")
        .textContent =
        "Editar filamento";


    $("#modal-filamento")
        .showModal();

}


function salvarFilamento(
    evento
) {

    evento.preventDefault();


    const campos =
        evento.currentTarget
        .elements;


    const anterior =

        estado.filamentos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    estado.filamentoEditando
                )

        );


    const codigo =
        campos.codigo
            .value
            .trim();


    if (!codigo) {

        avisar(

            "Informe o código do filamento.",

            true

        );

        return;

    }


    const codigoDuplicado =

        estado.filamentos

        .some(

            filamento =>

                String(
                    filamento.codigo
                )

                ===

                codigo

                &&

                String(
                    filamento.id
                )

                !==

                String(
                    anterior?.id
                )

        );


    if (codigoDuplicado) {

        avisar(

            "Já existe um filamento com esse código.",

            true

        );

        return;

    }


    const filamento = {

        ...(
            anterior ||
            {}
        ),

        id:

            anterior?.id ||
            criarID(),

        codigo,

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

        !filamento.marca ||
        !filamento.material ||
        !filamento.cor

    ) {

        avisar(

            "Informe marca, material e cor.",

            true

        );

        return;

    }


    if (

        filamento.pesoOriginal <=
        0

        ||

        filamento.pesoRestante <
        0

        ||

        filamento.pesoRestante >
        filamento.pesoOriginal

    ) {

        avisar(

            "Confira os pesos informados.",

            true

        );

        return;

    }


    estado.filamentos =

        anterior

        ? estado.filamentos.map(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    anterior.id
                )

                ? filamento

                : item

        )

        : [
            ...estado.filamentos,
            filamento
        ];


    salvarFilamentosLocal();


    estado.filamentoEditando =
        null;


    $("#modal-filamento")
        .close();


    avisar(
        "Filamento salvo."
    );

}


function excluirFilamento(
    id
) {

    if (

        !confirm(
            "Excluir este filamento?"
        )

    ) {

        return;

    }


    estado.filamentos =

        estado.filamentos

        .filter(

            item =>

                String(
                    item.id
                )

                !==

                String(
                    id
                )

        );


    salvarFilamentosLocal();

}


/* PRECIFICAÇÃO */

function preencherSelectProdutosPrec() {

    const select =
        $("#prec-produto");


    if (!select) {

        return;

    }


    const atual =
        select.value;


    select.innerHTML = `

        <option value="">
            Sem produto vinculado
        </option>

        ${

            estado.produtos.map(

                produto => `

                    <option value="${esc(
                        produto.id
                    )}">

                        ${esc(
                            produto.nome
                        )}

                        —

                        ${dinheiro(
                            produto.preco
                        )}

                    </option>

                `

            ).join("")

        }

    `;


    if (

        estado.produtos

        .some(

            produto =>

                String(
                    produto.id
                )

                ===

                String(
                    atual
                )

        )

    ) {

        select.value =
            atual;

    }

}


function preencherSelectsFilamentos() {

    for (

        let indice = 1;

        indice <= 4;

        indice++

    ) {

        const select =
            $(
                "#prec-filamento-" +
                indice
            );


        if (!select) {

            continue;

        }


        const atual =
            select.value;


        const filamentosOrdenados =

            estado.filamentos

            .slice()

            .sort(

                (
                    a,
                    b
                ) =>

                    String(
                        a.codigo
                    )

                    .localeCompare(
                        String(
                            b.codigo
                        )
                    )

            );


        select.innerHTML = `

            <option value="">
                Nenhum
            </option>

            ${

                filamentosOrdenados

                .map(

                    filamento => `

                        <option value="${esc(
                            filamento.id
                        )}">

                            ${esc(
                                filamento.codigo
                            )}

                            •

                            ${esc(
                                filamento.material
                            )}

                            •

                            ${esc(
                                filamento.cor
                            )}

                            •

                            ${esc(
                                filamento.marca
                            )}

                            •

                            ${
                                numero(
                                    filamento.pesoRestante
                                )
                            }g

                        </option>

                    `

                ).join("")

            }

        `;


        if (

            estado.filamentos

            .some(

                filamento =>

                    String(
                        filamento.id
                    )

                    ===

                    String(
                        atual
                    )

            )

        ) {

            select.value =
                atual;

        }

    }


    atualizarCustosLinhasFilamento();

}


function atualizarCustosLinhasFilamento() {

    for (

        let indice = 1;

        indice <= 4;

        indice++

    ) {

        const id =
            $(
                "#prec-filamento-" +
                indice
            )?.value;


        const gramas =
            numero(

                $(
                    "#prec-gramas-" +
                    indice
                )?.value

            );


        const filamento =

            estado.filamentos

            .find(

                item =>

                    String(
                        item.id
                    )

                    ===

                    String(
                        id
                    )

            );


        const elemento =
            $(
                "#prec-filamento-custo-" +
                indice
            );


        if (!elemento) {

            continue;

        }


        elemento.textContent =

            filamento

            ? `

                ${dinheiro(
                    custoGrama(
                        filamento
                    ) * gramas
                )}

                •

                ${dinheiro(
                    custoGrama(
                        filamento
                    )
                )}/g

                •

                saldo ${
                    numero(
                        filamento.pesoRestante
                    )
                }g

              `

            : "—";

    }

}


function carregarConfigNosCampos() {

    const config =
        estado.precConfig;


    const mapa = {

        "#cfg-energia":
            "energiaKwh",

        "#cfg-maoobra":
            "maoObraHora",

        "#cfg-perdas":
            "perdasPct",

        "#cfg-tributos":
            "tributosPct",

        "#cfg-outros-tributos":
            "outrosTributosPct",

        "#cfg-taxa-pagamento":
            "taxaPagamentoPct",

        "#cfg-taxa-fixa":
            "taxaPagamentoFixa",

        "#cfg-margem":
            "margemPct",

        "#cfg-impressora-valor":
            "impressoraValor",

        "#cfg-impressora-vida":
            "impressoraVidaHoras"

    };


    Object.entries(
        mapa
    )

    .forEach(

        ([
            seletor,
            chave
        ]) => {

            if ($(seletor)) {

                $(seletor)
                    .value =
                    numero(
                        config[chave]
                    );

            }

        }

    );


    const canais = {

        direta:
            "#cfg-canal-direta",

        site:
            "#cfg-canal-site",

        mercado_livre:
            "#cfg-canal-ml",

        shopee:
            "#cfg-canal-shopee",

        consignacao:
            "#cfg-canal-consignacao",

        personalizado:
            "#cfg-canal-personalizado"

    };


    Object.entries(
        canais
    )

    .forEach(

        ([
            chave,
            seletor
        ]) => {

            if ($(seletor)) {

                $(seletor)
                    .value =
                    numero(
                        config.canais[
                            chave
                        ]
                    );

            }

        }

    );


    aplicarPadroesAoCalculo();

}


function lerConfigDosCampos() {

    estado.precConfig = {

        energiaKwh:

            numero(
                $("#cfg-energia")
                    .value
            ),

        maoObraHora:

            numero(
                $("#cfg-maoobra")
                    .value
            ),

        perdasPct:

            numero(
                $("#cfg-perdas")
                    .value
            ),

        tributosPct:

            numero(
                $("#cfg-tributos")
                    .value
            ),

        outrosTributosPct:

            numero(
                $("#cfg-outros-tributos")
                    .value
            ),

        taxaPagamentoPct:

            numero(
                $("#cfg-taxa-pagamento")
                    .value
            ),

        taxaPagamentoFixa:

            numero(
                $("#cfg-taxa-fixa")
                    .value
            ),

        margemPct:

            numero(
                $("#cfg-margem")
                    .value
            ),

        impressoraValor:

            numero(
                $("#cfg-impressora-valor")
                    .value
            ),

        impressoraVidaHoras:

            numero(
                $("#cfg-impressora-vida")
                    .value
            ),

        canais: {

            direta:

                numero(
                    $("#cfg-canal-direta")
                        .value
                ),

            site:

                numero(
                    $("#cfg-canal-site")
                        .value
                ),

            mercado_livre:

                numero(
                    $("#cfg-canal-ml")
                        .value
                ),

            shopee:

                numero(
                    $("#cfg-canal-shopee")
                        .value
                ),

            consignacao:

                numero(
                    $("#cfg-canal-consignacao")
                        .value
                ),

            personalizado:

                numero(
                    $("#cfg-canal-personalizado")
                        .value
                )

        }

    };


    salvarPrecConfig();

    aplicarPadroesAoCalculo();


    avisar(
        "Configurações de precificação salvas."
    );

}


function aplicarPadroesAoCalculo() {

    const config =
        estado.precConfig;


    const valores = {

        "#prec-energia":
            config.energiaKwh,

        "#prec-maoobra-hora":
            config.maoObraHora,

        "#prec-perdas":
            config.perdasPct,

        "#prec-tributos":
            config.tributosPct,

        "#prec-outros-tributos":
            config.outrosTributosPct,

        "#prec-taxa-pagamento":
            config.taxaPagamentoPct,

        "#prec-taxa-fixa":
            config.taxaPagamentoFixa,

        "#prec-margem":
            config.margemPct,

        "#prec-impressora-valor":
            config.impressoraValor,

        "#prec-impressora-vida":
            config.impressoraVidaHoras

    };


    Object.entries(
        valores
    )

    .forEach(

        ([
            seletor,
            valor
        ]) => {

            if ($(seletor)) {

                $(seletor)
                    .value =
                    valor;

            }

        }

    );


    atualizarTaxaCanal();

    calcularPrecificacao();

}


function atualizarTaxaCanal() {

    const canal =
        $("#prec-canal")
            ?.value ||
        "direta";


    if ($("#prec-taxa-canal")) {

        $("#prec-taxa-canal")
            .value =

            numero(

                estado.precConfig
                    .canais[
                        canal
                    ]

            );

    }


    calcularPrecificacao();

}


/* ADICIONAIS */

function renderizarAdicionais() {

    const elemento =
        $("#prec-adicionais-lista");


    if (!elemento) {

        return;

    }


    elemento.innerHTML =

        estado.adicionais.length

        ? estado.adicionais

        .map(

            adicional => `

                <label class="adicional-item">

                    <input
                        type="checkbox"
                        data-adicional-id="${esc(
                            adicional.id
                        )}"
                    >

                    <span>

                        ${esc(
                            adicional.nome
                        )}

                    </span>

                    <strong>

                        ${dinheiro(
                            adicional.custo
                        )}

                    </strong>

                    <button
                        type="button"
                        class="mini-x"
                        data-adicional-excluir="${esc(
                            adicional.id
                        )}"
                        aria-label="Excluir adicional"
                    >
                        ×
                    </button>

                </label>

            `

        ).join("")

        : `

            <p class="texto-fraco">
                Nenhum adicional cadastrado.
            </p>

        `;

}


function adicionarAdicional() {

    const nome =
        $("#novo-adicional-nome")
            .value
            .trim();


    const custo =
        numero(
            $("#novo-adicional-custo")
                .value
        );


    if (!nome) {

        avisar(

            "Informe o nome do adicional.",

            true

        );

        return;

    }


    estado.adicionais.push({

        id:
            criarID(),

        nome,

        custo

    });


    $("#novo-adicional-nome")
        .value =
        "";


    $("#novo-adicional-custo")
        .value =
        "";


    salvarAdicionais();

}


function excluirAdicional(
    id
) {

    estado.adicionais =

        estado.adicionais

        .filter(

            adicional =>

                String(
                    adicional.id
                )

                !==

                String(
                    id
                )

        );


    salvarAdicionais();

}


/* CÁLCULO */

function arredondarComercial(
    valor
) {

    if (

        valor <=
        0

    ) {

        return 0;

    }


    const base =
        Math.floor(
            valor
        );


    let candidato =
        base +
        0.90;


    if (

        candidato <
        valor - 0.0000001

    ) {

        candidato =
            base +
            1.90;

    }


    return Math.round(
        candidato *
        100
    ) / 100;

}


function coletarFilamentosPrec() {

    const itens =
        [];


    for (

        let indice = 1;

        indice <= 4;

        indice++

    ) {

        const id =
            $(
                "#prec-filamento-" +
                indice
            )?.value;


        const gramas =

            Math.max(

                0,

                numero(

                    $(
                        "#prec-gramas-" +
                        indice
                    )?.value

                )

            );


        if (

            id &&
            gramas > 0

        ) {

            const filamento =

                estado.filamentos

                .find(

                    item =>

                        String(
                            item.id
                        )

                        ===

                        String(
                            id
                        )

                );


            if (filamento) {

                itens.push({

                    slot:
                        indice,

                    id:
                        filamento.id,

                    codigo:
                        filamento.codigo,

                    material:
                        filamento.material,

                    cor:
                        filamento.cor,

                    marca:
                        filamento.marca,

                    gramas,

                    custoGrama:
                        custoGrama(
                            filamento
                        ),

                    custo:

                        custoGrama(
                            filamento
                        )

                        *

                        gramas,

                    saldo:

                        numero(
                            filamento.pesoRestante
                        )

                });

            }

        }

    }


    return itens;

}


function calcularPrecificacao() {

    if (!$("#precificacao")) {

        return null;

    }


    atualizarCustosLinhasFilamento();


    const filamentos =
        coletarFilamentosPrec();


    const custoMaterial =

        filamentos

        .reduce(

            (
                total,
                item
            ) =>

                total +
                item.custo,

            0

        );


    const horas =

        Math.max(

            0,

            numero(
                $("#prec-horas")
                    ?.value
            )

        );


    const potencia =

        Math.max(

            0,

            numero(
                $("#prec-potencia")
                    ?.value
            )

        );


    const energiaKwh =

        Math.max(

            0,

            numero(
                $("#prec-energia")
                    ?.value
            )

        );


    const energia =

        (
            potencia /
            1000
        )

        *

        horas

        *

        energiaKwh;


    const impressoraValor =

        Math.max(

            0,

            numero(
                $("#prec-impressora-valor")
                    ?.value
            )

        );


    const impressoraVida =

        Math.max(

            0,

            numero(
                $("#prec-impressora-vida")
                    ?.value
            )

        );


    const depreciacao =

        impressoraVida > 0

        ? (
            impressoraValor /
            impressoraVida
        )

        *

        horas

        : 0;


    const maoMinutos =

        Math.max(

            0,

            numero(
                $("#prec-maoobra-min")
                    ?.value
            )

        );


    const maoHora =

        Math.max(

            0,

            numero(
                $("#prec-maoobra-hora")
                    ?.value
            )

        );


    const maoObra =

        (
            maoMinutos /
            60
        )

        *

        maoHora;


    const perdasPct =

        Math.max(

            0,

            numero(
                $("#prec-perdas")
                    ?.value
            )

        );


    const perdas =

        (
            custoMaterial +
            energia +
            depreciacao +
            maoObra
        )

        *

        (
            perdasPct /
            100
        );


    const adicionais =

        estado.adicionais

        .filter(

            adicional => {

                const checkbox =

                    document.querySelector(

                        `[data-adicional-id="${CSS.escape(
                            String(
                                adicional.id
                            )
                        )}"]`

                    );


                return checkbox
                    ?.checked;

            }

        );


    const custoAdicionais =

        adicionais

        .reduce(

            (
                total,
                adicional
            ) =>

                total +

                numero(
                    adicional.custo
                ),

            0

        );


    const outrosCustos =

        Math.max(

            0,

            numero(
                $("#prec-outros-custos")
                    ?.value
            )

        );


    const custoBase =

        custoMaterial +
        energia +
        depreciacao +
        maoObra +
        perdas +
        custoAdicionais +
        outrosCustos;


    const tributos =

        Math.max(

            0,

            numero(
                $("#prec-tributos")
                    ?.value
            )

        );


    const outrosTributos =

        Math.max(

            0,

            numero(
                $("#prec-outros-tributos")
                    ?.value
            )

        );


    const pagamentoPct =

        Math.max(

            0,

            numero(
                $("#prec-taxa-pagamento")
                    ?.value
            )

        );


    const pagamentoFixa =

        Math.max(

            0,

            numero(
                $("#prec-taxa-fixa")
                    ?.value
            )

        );


    const canalPct =

        Math.max(

            0,

            numero(
                $("#prec-taxa-canal")
                    ?.value
            )

        );


    const margem =

        Math.max(

            0,

            numero(
                $("#prec-margem")
                    ?.value
            )

        );


    const taxasSemMargem =

        (
            tributos +
            outrosTributos +
            pagamentoPct +
            canalPct
        )

        /
        100;


    const totalComMargem =

        (
            tributos +
            outrosTributos +
            pagamentoPct +
            canalPct +
            margem
        )

        /
        100;


    let precoMinimo =
        0;


    let precoBruto =
        0;


    let erro =
        "";


    if (

        taxasSemMargem >=
        0.99

        ||

        totalComMargem >=
        0.99

    ) {

        erro =

            "A soma de tributos, taxas, canal e margem " +

            "precisa ser menor que 99%.";


    } else {

        precoMinimo =

            (
                custoBase +
                pagamentoFixa
            )

            /

            (
                1 -
                taxasSemMargem
            );


        precoBruto =

            (
                custoBase +
                pagamentoFixa
            )

            /

            (
                1 -
                totalComMargem
            );

    }


    const sugerido =

        erro

        ? 0

        : arredondarComercial(
            precoBruto
        );


    const valorTributos =

        sugerido

        *

        (
            (
                tributos +
                outrosTributos
            )

            /
            100
        );


    const valorTaxas =

        sugerido

        *

        (
            (
                pagamentoPct +
                canalPct
            )

            /
            100
        )

        +

        pagamentoFixa;


    const lucro =

        Math.max(

            0,

            sugerido -
            custoBase -
            valorTributos -
            valorTaxas

        );


    const resultado = {

        filamentos,

        custoMaterial,

        energia,

        depreciacao,

        maoObra,

        perdas,

        adicionais,

        custoAdicionais,

        outrosCustos,

        custoBase,

        tributos,

        outrosTributos,

        pagamentoPct,

        pagamentoFixa,

        canalPct,

        margem,

        precoMinimo,

        precoBruto,

        sugerido,

        valorTributos,

        valorTaxas,

        lucro,

        erro,

        horas,

        potencia

    };


    estado.ultimoCalculo =
        resultado;


    const mapa = {

        "#r-material":
            custoMaterial,

        "#r-energia":
            energia,

        "#r-depreciacao":
            depreciacao,

        "#r-maoobra":
            maoObra,

        "#r-perdas":
            perdas,

        "#r-adicionais":

            custoAdicionais +
            outrosCustos,

        "#r-custo-base":
            custoBase,

        "#r-preco-minimo":
            precoMinimo,

        "#r-preco-sugerido":
            sugerido,

        "#r-tributos":
            valorTributos,

        "#r-taxas":
            valorTaxas,

        "#r-lucro":
            lucro

    };


    Object.entries(
        mapa
    )

    .forEach(

        ([
            seletor,
            valor
        ]) => {

            if ($(seletor)) {

                $(seletor)
                    .textContent =
                    dinheiro(
                        valor
                    );

            }

        }

    );


    if ($("#prec-erro")) {

        $("#prec-erro")
            .textContent =
            erro;


        $("#prec-erro")
            .hidden =
            !erro;

    }


    if ($("#prec-atualizar-produto")) {

        $("#prec-atualizar-produto")
            .disabled =

            !$("#prec-produto")
                ?.value

            ||

            !!erro;

    }


    return resultado;

}


/* HISTÓRICO */

function renderizarHistorico() {

    const tabela =
        $("#tabela-historico-prec");


    if (!tabela) {

        return;

    }


    const lista =

        [
            ...estado.historico
        ]

        .reverse()

        .slice(
            0,
            100
        );


    tabela.innerHTML =

        lista.length

        ? lista.map(

            historico => `

                <tr>

                    <td>

                        ${formatarData(
                            historico.data
                        )}

                    </td>

                    <td>

                        ${esc(
                            historico.produtoNome ||
                            "Avulso"
                        )}

                    </td>

                    <td>

                        ${esc(
                            historico.canalLabel ||
                            historico.canal ||
                            ""
                        )}

                    </td>

                    <td>

                        ${
                            (
                                historico.filamentos ||
                                []
                            )

                            .map(

                                filamento =>

                                    `${esc(
                                        filamento.codigo
                                    )}: ${
                                        numero(
                                            filamento.gramas
                                        )
                                    }g`

                            )

                            .join(
                                "<br>"
                            )

                            ||
                            "—"
                        }

                    </td>

                    <td>

                        ${dinheiro(
                            historico.custoBase
                        )}

                    </td>

                    <td>

                        ${dinheiro(
                            historico.precoSugerido
                        )}

                    </td>

                    <td>

                        ${
                            historico.baixouEstoque
                                ? "Sim"
                                : "Não"
                        }

                    </td>

                </tr>

            `

        ).join("")

        : `

            <tr>

                <td colspan="7">
                    Nenhuma precificação registrada.
                </td>

            </tr>

        `;

}


function salvarCalculoHistorico(
    baixouEstoque
) {

    const resultado =
        calcularPrecificacao();


    if (

        !resultado ||
        resultado.erro

    ) {

        avisar(

            resultado?.erro ||
            "Não foi possível calcular.",

            true

        );

        return null;

    }


    const produtoId =
        $("#prec-produto")
            ?.value;


    const produto =

        estado.produtos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    produtoId
                )

        );


    const canal =
        $("#prec-canal")
            ?.value ||
        "direta";


    const canalLabel =

        $("#prec-canal")
            ?.selectedOptions?.[0]
            ?.textContent
            ?.trim()

        ||

        canal;


    const historico = {

        id:
            criarID(),

        data:
            agoraISO(),

        produtoId:
            produto?.id ||
            null,

        produtoNome:
            produto?.nome ||
            "Avulso",

        canal,

        canalLabel,

        filamentos:

            resultado.filamentos

            .map(

                filamento => ({

                    id:
                        filamento.id,

                    codigo:
                        filamento.codigo,

                    material:
                        filamento.material,

                    cor:
                        filamento.cor,

                    gramas:
                        filamento.gramas,

                    custo:
                        filamento.custo

                })

            ),

        custoBase:
            resultado.custoBase,

        precoMinimo:
            resultado.precoMinimo,

        precoSugerido:
            resultado.sugerido,

        lucro:
            resultado.lucro,

        baixouEstoque,

        config: {

            tributos:
                resultado.tributos,

            outrosTributos:
                resultado.outrosTributos,

            pagamentoPct:
                resultado.pagamentoPct,

            pagamentoFixa:
                resultado.pagamentoFixa,

            canalPct:
                resultado.canalPct,

            margem:
                resultado.margem

        }

    };


    estado.historico.push(
        historico
    );


    salvarHistorico();


    return historico;

}


function salvarCalculoSemBaixa() {

    const historico =
        salvarCalculoHistorico(
            false
        );


    if (historico) {

        avisar(
            "Precificação salva no histórico."
        );

    }

}


/* BAIXA AUTOMÁTICA DE FILAMENTO */

function registrarProducaoBaixarFilamento() {

    const resultado =
        calcularPrecificacao();


    if (

        !resultado ||
        resultado.erro

    ) {

        avisar(

            resultado?.erro ||
            "Não foi possível calcular.",

            true

        );

        return;

    }


    if (

        !resultado.filamentos
            .length

    ) {

        avisar(

            "Selecione pelo menos um filamento " +

            "e informe o consumo em gramas.",

            true

        );

        return;

    }


    const consumo =
        new Map();


    /*
    Se o mesmo filamento for usado em mais de uma troca,
    os consumos são somados.
    */

    for (

        const item
        of resultado.filamentos

    ) {

        const chave =
            String(
                item.id
            );


        consumo.set(

            chave,

            (
                consumo.get(
                    chave
                ) ||
                0
            )

            +

            item.gramas

        );

    }


    /*
    Primeiro validamos todo o estoque.
    Nenhum filamento é alterado se algum deles
    não tiver saldo suficiente.
    */

    for (

        const [
            id,
            gramas
        ]

        of consumo

    ) {

        const filamento =

            estado.filamentos

            .find(

                item =>

                    String(
                        item.id
                    )

                    ===

                    id

            );


        if (!filamento) {

            avisar(

                "Filamento não encontrado.",

                true

            );

            return;

        }


        if (

            numero(
                filamento.pesoRestante
            )

            <

            gramas

        ) {

            avisar(

                `Saldo insuficiente no filamento ${
                    filamento.codigo
                }. Disponível: ${
                    numero(
                        filamento.pesoRestante
                    )
                } g.`,

                true

            );

            return;

        }

    }


    const resumo =

        [
            ...consumo
        ]

        .map(

            ([
                id,
                gramas
            ]) => {

                const filamento =

                    estado.filamentos

                    .find(

                        item =>

                            String(
                                item.id
                            )

                            ===

                            id

                    );


                return `

                    ${filamento.codigo}

                    (${filamento.material} ${filamento.cor}):

                    -${gramas} g

                `

                .replace(
                    /\s+/g,
                    " "
                )

                .trim();

            }

        )

        .join(
            "\n"
        );


    if (

        !confirm(

            "Registrar produção e dar baixa nos filamentos?\n\n"

            +

            resumo

        )

    ) {

        return;

    }


    estado.filamentos =

        estado.filamentos

        .map(

            filamento => {

                const gramas =

                    consumo.get(
                        String(
                            filamento.id
                        )
                    )

                    ||

                    0;


                if (!gramas) {

                    return filamento;

                }


                return {

                    ...filamento,

                    pesoRestante:

                        Math.max(

                            0,

                            numero(
                                filamento.pesoRestante
                            )

                            -

                            gramas

                        ),

                    atualizado_em:
                        agoraISO()

                };

            }

        );


    salvarFilamentosLocal();


    const historico =
        salvarCalculoHistorico(
            true
        );


    avisar(

        historico

        ? "Produção registrada e estoque de filamentos atualizado."

        : "Estoque atualizado."

    );


    renderizarPrecificacao();

}


/* ATUALIZAR PREÇO NO SUPABASE */

async function atualizarPrecoProduto() {

    const id =
        $("#prec-produto")
            ?.value;


    const resultado =
        calcularPrecificacao();


    if (

        !id ||
        !resultado ||
        resultado.erro ||
        resultado.sugerido <=
        0

    ) {

        avisar(

            "Selecione um produto e calcule um preço válido.",

            true

        );

        return;

    }


    const produto =

        estado.produtos

        .find(

            item =>

                String(
                    item.id
                )

                ===

                String(
                    id
                )

        );


    if (!produto) {

        return;

    }


    if (

        !confirm(

            `Atualizar o preço de "${produto.nome}" para ${dinheiro(
                resultado.sugerido
            )}?`

        )

    ) {

        return;

    }


    try {

        await salvarCatalogo(

            estado.produtos

            .map(

                item =>

                    String(
                        item.id
                    )

                    ===

                    String(
                        id
                    )

                    ? {

                        ...item,

                        preco:
                            resultado.sugerido,

                        atualizado_em:
                            agoraISO()

                    }

                    : item

            )

        );


        preencherSelectProdutosPrec();


        $("#prec-produto")
            .value =
            id;


        avisar(

            "Preço do produto atualizado no catálogo."

        );


    } catch (
        erro
    ) {

        avisar(

            erro.message,

            true

        );

    }

}


function renderizarPrecificacao() {

    preencherSelectProdutosPrec();

    preencherSelectsFilamentos();

    renderizarAdicionais();

    renderizarHistorico();

    calcularPrecificacao();

}


/* EXPORTAÇÃO */

function baixarArquivo(

    nome,

    conteudo,

    tipo

) {

    const blob =
        new Blob(

            [
                conteudo
            ],

            {
                type:
                    tipo
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


function exportarCSV(

    nome,

    cabecalho,

    linhas

) {

    function campo(
        valor
    ) {

        let texto =
            String(
                valor ??
                ""
            );


        if (

            /^[\s]*[=+\-@]/
            .test(
                texto
            )

        ) {

            texto =
                "'" +
                texto;

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


    const conteudo = [

        cabecalho

            .map(
                campo
            )

            .join(
                ";"
            ),

        ...linhas

        .map(

            linha =>

                linha

                .map(
                    campo
                )

                .join(
                    ";"
                )

        )

    ]

    .join(
        "\r\n"
    );


    baixarArquivo(

        nome,

        "\uFEFF" +
        conteudo,

        "text/csv;charset=utf-8"

    );

}


/* BACKUP */

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
                    estado.filamentos,

                precConfig:
                    estado.precConfig,

                adicionais:
                    estado.adicionais,

                historico:
                    estado.historico

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
        evento.target
            .files?.[0];


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


        if (
            dados.precConfig
        ) {

            estado.precConfig = {

                ...copiar(
                    CONFIG_PADRAO
                ),

                ...dados.precConfig,

                canais: {

                    ...CONFIG_PADRAO.canais,

                    ...(
                        dados.precConfig
                            .canais ||
                        {}
                    )

                }

            };

        }


        if (

            Array.isArray(
                dados.adicionais
            )

        ) {

            estado.adicionais =
                dados.adicionais;

        }


        if (

            Array.isArray(
                dados.historico
            )

        ) {

            estado.historico =
                dados.historico;

        }


        salvarLocal(
            KEYS.pedidos,
            estado.pedidos
        );


        salvarLocal(
            KEYS.custos,
            estado.custos
        );


        salvarLocal(
            KEYS.filamentos,
            estado.filamentos
        );


        salvarPrecConfig();


        salvarLocal(
            KEYS.adicionais,
            estado.adicionais
        );


        salvarLocal(
            KEYS.historico,
            estado.historico
        );


        migrarCodigosFilamentos();

        carregarConfigNosCampos();

        atualizarPainel();


        avisar(
            "Backup restaurado."
        );


    } catch {

        avisar(

            "Backup inválido.",

            true

        );

    }


    evento.target.value =
        "";

}


/* ATUALIZAÇÃO GERAL */

function atualizarPainel() {

    atualizarIndicadores();

    renderizarRecentes();

    renderizarProdutos();

    renderizarPedidos();

    renderizarCustos();

    renderizarFilamentos();

    preencherSelectProdutosPrec();

    renderizarHistorico();


    if ($("#data-atual")) {

        $("#data-atual")
            .textContent =

            new Date()

            .toLocaleDateString(

                "pt-BR",

                {
                    day:
                        "2-digit",

                    month:
                        "long",

                    year:
                        "numeric"
                }

            );

    }

}


/* EVENTOS */

function configurarEventos() {

    document.addEventListener(

        "click",

        evento => {

            const pagina =

                evento.target.closest(
                    "[data-pagina]"
                );


            if (pagina) {

                abrirPagina(
                    pagina.dataset.pagina
                );

                return;

            }


            const ir =

                evento.target.closest(
                    "[data-ir]"
                );


            if (ir) {

                abrirPagina(
                    ir.dataset.ir
                );

                return;

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


                return;

            }


            const acoes = [

                [
                    "[data-produto-editar]",

                    elemento =>
                        editarProduto(
                            elemento.dataset
                                .produtoEditar
                        )
                ],

                [
                    "[data-produto-excluir]",

                    elemento =>
                        excluirProduto(
                            elemento.dataset
                                .produtoExcluir
                        )
                ],

                [
                    "[data-pedido-editar]",

                    elemento =>
                        editarPedido(
                            elemento.dataset
                                .pedidoEditar
                        )
                ],

                [
                    "[data-pedido-excluir]",

                    elemento =>
                        excluirPedido(
                            elemento.dataset
                                .pedidoExcluir
                        )
                ],

                [
                    "[data-custo-editar]",

                    elemento =>
                        editarCusto(
                            elemento.dataset
                                .custoEditar
                        )
                ],

                [
                    "[data-custo-excluir]",

                    elemento =>
                        excluirCusto(
                            elemento.dataset
                                .custoExcluir
                        )
                ],

                [
                    "[data-filamento-editar]",

                    elemento =>
                        editarFilamento(
                            elemento.dataset
                                .filamentoEditar
                        )
                ],

                [
                    "[data-filamento-excluir]",

                    elemento =>
                        excluirFilamento(
                            elemento.dataset
                                .filamentoExcluir
                        )
                ],

                [
                    "[data-adicional-excluir]",

                    elemento =>
                        excluirAdicional(
                            elemento.dataset
                                .adicionalExcluir
                        )
                ]

            ];


            for (

                const [
                    seletor,
                    funcao
                ]

                of acoes

            ) {

                const elemento =
                    evento.target.closest(
                        seletor
                    );


                if (elemento) {

                    evento.preventDefault();

                    funcao(
                        elemento
                    );

                    return;

                }

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
            salvarPedido
        );


    $("#form-custo")
        ?.addEventListener(
            "submit",
            salvarCusto
        );


    $("#form-filamento")
        ?.addEventListener(
            "submit",
            salvarFilamento
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


    $("#salvar-config-prec")
        ?.addEventListener(
            "click",
            lerConfigDosCampos
        );


    $("#novo-adicional-btn")
        ?.addEventListener(
            "click",
            adicionarAdicional
        );


    $("#prec-canal")
        ?.addEventListener(
            "change",
            atualizarTaxaCanal
        );


    $("#prec-salvar-calculo")
        ?.addEventListener(
            "click",
            salvarCalculoSemBaixa
        );


    $("#prec-baixar-estoque")
        ?.addEventListener(
            "click",
            registrarProducaoBaixarFilamento
        );


    $("#prec-atualizar-produto")
        ?.addEventListener(
            "click",
            atualizarPrecoProduto
        );


    const camposPrecificacao = [

        "#prec-produto",

        "#prec-horas",

        "#prec-potencia",

        "#prec-energia",

        "#prec-maoobra-min",

        "#prec-maoobra-hora",

        "#prec-perdas",

        "#prec-tributos",

        "#prec-outros-tributos",

        "#prec-taxa-pagamento",

        "#prec-taxa-fixa",

        "#prec-taxa-canal",

        "#prec-margem",

        "#prec-impressora-valor",

        "#prec-impressora-vida",

        "#prec-outros-custos",

        "#prec-filamento-1",

        "#prec-filamento-2",

        "#prec-filamento-3",

        "#prec-filamento-4",

        "#prec-gramas-1",

        "#prec-gramas-2",

        "#prec-gramas-3",

        "#prec-gramas-4"

    ];


    camposPrecificacao

    .forEach(

        seletor => {

            $(seletor)
                ?.addEventListener(
                    "input",
                    calcularPrecificacao
                );


            $(seletor)
                ?.addEventListener(
                    "change",
                    calcularPrecificacao
                );

        }

    );


    $("#prec-adicionais-lista")
        ?.addEventListener(
            "change",
            calcularPrecificacao
        );


    $("#exportar-pedidos")
        ?.addEventListener(

            "click",

            () =>

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

                    estado.pedidos

                    .map(

                        item => [

                            item.cliente,
                            item.contato,
                            item.itens,
                            item.valor,
                            item.status,
                            item.data

                        ]

                    )

                )

        );


    $("#exportar-custos")
        ?.addEventListener(

            "click",

            () =>

                exportarCSV(

                    "custos-criaitor3d.csv",

                    [
                        "Descrição",
                        "Categoria",
                        "Tipo",
                        "Valor",
                        "Data",
                        "Observações"
                    ],

                    estado.custos

                    .map(

                        item => [

                            item.descricao,
                            item.categoria,
                            item.tipo,
                            item.valor,
                            item.data,
                            item.observacoes

                        ]

                    )

                )

        );


    $("#exportar-filamentos")
        ?.addEventListener(

            "click",

            () =>

                exportarCSV(

                    "filamentos-criaitor3d.csv",

                    [
                        "Código",
                        "Marca",
                        "Material",
                        "Cor",
                        "Peso original",
                        "Peso restante",
                        "Consumido",
                        "Valor pago",
                        "Custo/g"
                    ],

                    estado.filamentos

                    .map(

                        filamento => [

                            filamento.codigo,
                            filamento.marca,
                            filamento.material,
                            filamento.cor,
                            filamento.pesoOriginal,
                            filamento.pesoRestante,

                            numero(
                                filamento.pesoOriginal
                            )

                            -

                            numero(
                                filamento.pesoRestante
                            ),

                            filamento.valorPago,

                            custoGrama(
                                filamento
                            )

                        ]

                    )

                )

        );


    $("#exportar-historico-prec")
        ?.addEventListener(

            "click",

            () =>

                exportarCSV(

                    "precificacao-criaitor3d.csv",

                    [
                        "Data",
                        "Produto",
                        "Canal",
                        "Filamentos",
                        "Custo base",
                        "Preço sugerido",
                        "Baixa estoque"
                    ],

                    estado.historico

                    .map(

                        historico => [

                            historico.data,

                            historico.produtoNome,

                            historico.canalLabel,

                            (
                                historico.filamentos ||
                                []
                            )

                            .map(

                                filamento =>

                                    `${filamento.codigo}:${filamento.gramas}g`

                            )

                            .join(
                                " | "
                            ),

                            historico.custoBase,

                            historico.precoSugerido,

                            historico.baixouEstoque
                                ? "Sim"
                                : "Não"

                        ]

                    )

                )

        );


    $("#exportar-catalogo")
        ?.addEventListener(

            "click",

            () =>

                baixarArquivo(

                    "catalogo.js",

                    "window.CRIAITOR_CATALOGO = "

                    +

                    JSON.stringify(

                        estado.produtos,

                        null,

                        2

                    )

                    +

                    ";\n",

                    "text/javascript"

                )

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


    $("#recarregar-catalogo")
        ?.addEventListener(

            "click",

            async () => {

                try {

                    await carregarCatalogo();


                    avisar(
                        "Catálogo atualizado."
                    );


                } catch (
                    erro
                ) {

                    avisar(

                        erro.message,

                        true

                    );

                }

            }

        );

}


/* INICIAR */

async function iniciar() {

    carregarLocais();

    configurarEventos();

    carregarConfigNosCampos();

    abrirPagina(
        "dashboard"
    );

    atualizarPainel();


    try {

        await carregarCatalogo();


    } catch (
        erro
    ) {

        console.error(
            erro
        );


        avisar(

            erro.message,

            true

        );

    }


    setInterval(

        async () => {

            if (

                estado.salvandoCatalogo

                ||

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

                    .from(
                        CONFIG.tabela
                    )

                    .select(
                        "versao"
                    )

                    .eq(
                        "id",
                        CONFIG.registro
                    )

                    .single();


                if (

                    !error

                    &&

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

        },

        30000

    );

}


/* API */

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
        () =>
            null,

    getCustos:
        () => [
            ...estado.custos
        ],

    getFilamentos:
        () => [
            ...estado.filamentos
        ],

    getHistoricoPrecificacao:
        () => [
            ...estado.historico
        ]

};


if (

    document.readyState ===
    "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        iniciar,

        {
            once:
                true
        }

    );


} else {

    iniciar();

}

})();
