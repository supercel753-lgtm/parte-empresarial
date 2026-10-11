(function () {

"use strict";


/* ==========================================================
   CRIAITOR 3D
   IMPORTADOR CSV - ÁREA EMPRESARIAL
========================================================== */


const sb =
    window.sb;


const SUPABASE_CONFIG =
    window.CRIAITOR_SUPABASE_CONFIG ||
    {};


const CONFIG = {

    tabela:
        SUPABASE_CONFIG.tabelaCatalogo ||
        "catalogo",

    registro:
        SUPABASE_CONFIG.registroCatalogo ||
        1

};


const STORAGE_KEYS = {

    pedidos:
        "criaitor3d_pedidos",

    custos:
        "criaitor3d_custos",

    filamentos:
        "criaitor3d_filamentos"

};


const TIPOS = {

    produtos: {

        nome:
            "Produtos",

        colunas: [
            "id",
            "nome",
            "categoria",
            "preco",
            "estoque",
            "prazo",
            "imagem",
            "descricao",
            "disponivel",
            "destaque"
        ],

        exemplo: [
            "",
            "Chaveiro Capivara",
            "Chaveiros",
            "14,90",
            "10",
            "Produção sob encomenda",
            "",
            "Chaveiro produzido em impressão 3D",
            "sim",
            "nao"
        ]

    },


    pedidos: {

        nome:
            "Pedidos",

        colunas: [
            "id",
            "cliente",
            "contato",
            "itens",
            "valor",
            "status",
            "data"
        ],

        exemplo: [
            "",
            "Cliente Exemplo",
            "51999999999",
            "1x Chaveiro Capivara",
            "14,90",
            "Novo",
            "2026-10-11"
        ]

    },


    custos: {

        nome:
            "Custos",

        colunas: [
            "id",
            "descricao",
            "categoria",
            "tipo",
            "valor",
            "data",
            "observacoes"
        ],

        exemplo: [
            "",
            "Embalagens",
            "Embalagem",
            "Variável",
            "25,00",
            "2026-10-11",
            "Compra de embalagens"
        ]

    },


    filamentos: {

        nome:
            "Filamentos",

        colunas: [
            "id",
            "codigo",
            "marca",
            "material",
            "cor",
            "diametro",
            "pesoOriginal",
            "pesoRestante",
            "valorPago",
            "limiteBaixo",
            "observacoes"
        ],

        exemplo: [
            "",
            "001",
            "Voolt",
            "PLA",
            "Preto",
            "1,75",
            "1000",
            "850",
            "120,00",
            "200",
            "Rolo em uso"
        ]

    }

};


/* ==========================================================
   HELPERS
========================================================== */


function $(seletor) {

    return document.querySelector(
        seletor
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


function normalizarCabecalho(valor) {

    return String(
        valor || ""
    )

    .trim()

    .normalize(
        "NFD"
    )

    .replace(
        /[\u0300-\u036f]/g,
        ""
    )

    .toLowerCase()

    .replace(
        /[^a-z0-9]/g,
        ""
    );

}


function limparTexto(valor) {

    return String(
        valor ?? ""
    ).trim();

}


function numeroBR(valor) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return 0;

    }


    let texto =
        String(valor)
            .trim();


    texto =
        texto

        .replace(
            /R\$/gi,
            ""
        )

        .replace(
            /\s/g,
            ""
        );


    /*
    1.234,56
    -> 1234.56
    */

    if (
        texto.includes(",") &&
        texto.includes(".")
    ) {

        if (
            texto.lastIndexOf(",") >
            texto.lastIndexOf(".")
        ) {

            texto =
                texto
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );

        } else {

            texto =
                texto
                    .replace(
                        /,/g,
                        ""
                    );

        }

    }

    /*
    49,90
    -> 49.90
    */

    else if (
        texto.includes(",")
    ) {

        texto =
            texto.replace(
                ",",
                "."
            );

    }


    const n =
        Number(texto);


    return Number.isFinite(n)
        ? n
        : 0;

}


function booleano(valor, padrao = false) {

    if (
        typeof valor ===
        "boolean"
    ) {

        return valor;

    }


    const texto =

        String(
            valor ?? ""
        )

        .trim()

        .toLowerCase();


    if (
        [
            "1",
            "true",
            "sim",
            "s",
            "yes",
            "y",
            "ativo",
            "visivel",
            "disponivel"
        ]
        .includes(
            texto
        )
    ) {

        return true;

    }


    if (
        [
            "0",
            "false",
            "nao",
            "não",
            "n",
            "no",
            "inativo",
            "oculto",
            "indisponivel"
        ]
        .includes(
            texto
        )
    ) {

        return false;

    }


    return padrao;

}


function codigoFilamento(valor) {

    const texto =
        String(
            valor ?? ""
        )
        .trim();


    if (!texto) {

        return "";

    }


    /*
    Se veio 1, transforma em 001.
    Se veio ABC, mantém ABC.
    */

    if (
        /^\d+$/.test(
            texto
        )
    ) {

        return texto
            .padStart(
                3,
                "0"
            );

    }


    return texto;

}


function lerLocal(
    chave
) {

    try {

        const valor =
            localStorage.getItem(
                chave
            );


        const resultado =
            valor
                ? JSON.parse(
                    valor
                )
                : [];


        return Array.isArray(
            resultado
        )
            ? resultado
            : [];


    } catch {

        return [];

    }

}


function salvarLocal(
    chave,
    dados
) {

    localStorage.setItem(

        chave,

        JSON.stringify(
            dados
        )

    );

}


function mostrarStatus(
    mensagem,
    tipo = "normal"
) {

    const status =
        $("#csv-status");


    if (!status) {

        return;

    }


    status.textContent =
        mensagem;


    status.className =
        "csv-status " +
        tipo;

}


/* ==========================================================
   PARSER CSV
========================================================== */


function detectarSeparador(
    texto
) {

    const primeiraLinha =
        texto
            .split(
                /\r?\n/
            )[0] ||
        "";


    let virgulas =
        0;


    let pontosVirgula =
        0;


    let aspas =
        false;


    for (
        let i = 0;
        i < primeiraLinha.length;
        i++
    ) {

        const caractere =
            primeiraLinha[i];


        if (
            caractere === '"'
        ) {

            aspas =
                !aspas;

        }


        if (!aspas) {

            if (
                caractere === ","
            ) {

                virgulas++;

            }


            if (
                caractere === ";"
            ) {

                pontosVirgula++;

            }

        }

    }


    return pontosVirgula >=
        virgulas

        ? ";"
        : ",";

}


function parseCSV(
    texto
) {

    texto =
        String(texto || "")
            .replace(
                /^\uFEFF/,
                ""
            );


    const separador =
        detectarSeparador(
            texto
        );


    const linhas =
        [];


    let linha =
        [];


    let campo =
        "";


    let emAspas =
        false;


    for (
        let i = 0;
        i < texto.length;
        i++
    ) {

        const caractere =
            texto[i];


        const proximo =
            texto[i + 1];


        if (
            caractere === '"'
        ) {

            if (
                emAspas &&
                proximo === '"'
            ) {

                campo += '"';

                i++;

            } else {

                emAspas =
                    !emAspas;

            }


            continue;

        }


        if (
            caractere === separador &&
            !emAspas
        ) {

            linha.push(
                campo
            );


            campo =
                "";


            continue;

        }


        if (
            (
                caractere === "\n" ||
                caractere === "\r"
            )
            &&
            !emAspas
        ) {

            if (
                caractere === "\r" &&
                proximo === "\n"
            ) {

                i++;

            }


            linha.push(
                campo
            );


            campo =
                "";


            const temConteudo =
                linha.some(
                    valor =>
                        String(valor)
                            .trim() !==
                        ""
                );


            if (temConteudo) {

                linhas.push(
                    linha
                );

            }


            linha =
                [];


            continue;

        }


        campo +=
            caractere;

    }


    linha.push(
        campo
    );


    if (
        linha.some(
            valor =>
                String(valor)
                    .trim() !==
                ""
        )
    ) {

        linhas.push(
            linha
        );

    }


    if (
        linhas.length <
        2
    ) {

        throw new Error(
            "O CSV precisa ter cabeçalho e pelo menos uma linha de dados."
        );

    }


    const cabecalhos =

        linhas[0]

        .map(
            normalizarCabecalho
        );


    return linhas

        .slice(
            1
        )

        .map(

            valores => {

                const objeto =
                    {};


                cabecalhos
                    .forEach(

                        (
                            cabecalho,
                            indice
                        ) => {

                            objeto[
                                cabecalho
                            ] =
                                valores[
                                    indice
                                ] ??
                                "";

                        }

                    );


                return objeto;

            }

        );

}


/* ==========================================================
   MAPEAMENTO DE COLUNAS
========================================================== */


function pegar(
    linha,
    ...nomes
) {

    for (
        const nome
        of nomes
    ) {

        const chave =
            normalizarCabecalho(
                nome
            );


        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    linha,
                    chave
                )
        ) {

            return linha[
                chave
            ];

        }

    }


    return "";

}


/* ==========================================================
   PRODUTOS
========================================================== */


function converterProduto(
    linha
) {

    const nome =
        limparTexto(
            pegar(
                linha,
                "nome",
                "produto"
            )
        );


    if (!nome) {

        return null;

    }


    return {

        id:
            limparTexto(
                pegar(
                    linha,
                    "id"
                )
            )
            ||
            criarID(),

        nome,

        categoria:
            limparTexto(
                pegar(
                    linha,
                    "categoria"
                )
            )
            ||
            "Outros",

        preco:
            numeroBR(
                pegar(
                    linha,
                    "preco",
                    "preço",
                    "valor"
                )
            ),

        estoque:
            Math.max(
                0,
                Math.trunc(
                    numeroBR(
                        pegar(
                            linha,
                            "estoque",
                            "quantidade"
                        )
                    )
                )
            ),

        prazo:
            limparTexto(
                pegar(
                    linha,
                    "prazo"
                )
            )
            ||
            "Produção sob encomenda",

        imagem:
            limparTexto(
                pegar(
                    linha,
                    "imagem",
                    "foto",
                    "urlimagem"
                )
            ),

        descricao:
            limparTexto(
                pegar(
                    linha,
                    "descricao",
                    "descrição"
                )
            ),

        disponivel:
            booleano(
                pegar(
                    linha,
                    "disponivel",
                    "disponível",
                    "visivel",
                    "visível"
                ),
                true
            ),

        destaque:
            booleano(
                pegar(
                    linha,
                    "destaque"
                ),
                false
            ),

        atualizado_em:
            new Date()
                .toISOString()

    };

}


async function importarProdutos(
    linhas,
    modo
) {

    if (!sb) {

        throw new Error(
            "Supabase não está disponível."
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

        throw error;

    }


    const atuais =

        Array.isArray(
            data.produtos
        )

        ? data.produtos

        : [];


    const importados =

        linhas

        .map(
            converterProduto
        )

        .filter(Boolean);


    if (
        !importados.length
    ) {

        throw new Error(
            "Nenhum produto válido foi encontrado."
        );

    }


    let resultado;


    if (
        modo ===
        "substituir"
    ) {

        resultado =
            importados;

    } else {

        resultado =
            [
                ...atuais
            ];


        for (
            const produto
            of importados
        ) {

            const indice =

                resultado

                .findIndex(

                    atual => {

                        if (
                            produto.id &&
                            atual.id &&
                            String(
                                produto.id
                            ) ===
                            String(
                                atual.id
                            )
                        ) {

                            return true;

                        }


                        return (

                            String(
                                atual.nome ||
                                ""
                            )
                            .trim()
                            .toLowerCase()

                            ===

                            String(
                                produto.nome ||
                                ""
                            )
                            .trim()
                            .toLowerCase()

                            &&

                            String(
                                atual.categoria ||
                                ""
                            )
                            .trim()
                            .toLowerCase()

                            ===

                            String(
                                produto.categoria ||
                                ""
                            )
                            .trim()
                            .toLowerCase()

                        );

                    }

                );


            if (
                indice >=
                0
            ) {

                /*
                Preserva imagem existente se o CSV
                não trouxe uma nova.
                */

                resultado[
                    indice
                ] = {

                    ...resultado[
                        indice
                    ],

                    ...produto,

                    imagem:
                        produto.imagem
                        ||
                        resultado[
                            indice
                        ].imagem
                        ||
                        ""

                };

            } else {

                resultado.push(
                    produto
                );

            }

        }

    }


    const versao =
        Number(
            data.versao
        ) ||
        0;


    const {
        data: salvo,
        error: erroSalvar
    } = await sb

        .from(
            CONFIG.tabela
        )

        .update({

            produtos:
                resultado,

            versao:
                versao + 1

        })

        .eq(
            "id",
            CONFIG.registro
        )

        .eq(
            "versao",
            versao
        )

        .select(
            "versao"
        );


    if (erroSalvar) {

        throw erroSalvar;

    }


    if (
        !salvo ||
        !salvo.length
    ) {

        throw new Error(
            "O catálogo foi alterado durante a importação. Atualize a página e tente novamente."
        );

    }


    return {

        importados:
            importados.length,

        total:
            resultado.length

    };

}


/* ==========================================================
   FILAMENTOS
========================================================== */


function converterFilamento(
    linha
) {

    const codigo =
        codigoFilamento(
            pegar(
                linha,
                "codigo",
                "código"
            )
        );


    if (!codigo) {

        return null;

    }


    const pesoOriginal =
        numeroBR(
            pegar(
                linha,
                "pesoOriginal",
                "peso original",
                "peso_original"
            )
        );


    let pesoRestante =
        numeroBR(
            pegar(
                linha,
                "pesoRestante",
                "peso restante",
                "peso_restante"
            )
        );


    if (
        pesoRestante ===
        0 &&
        pesoOriginal >
        0 &&
        limparTexto(
            pegar(
                linha,
                "pesoRestante",
                "peso restante",
                "peso_restante"
            )
        ) ===
        ""
    ) {

        pesoRestante =
            pesoOriginal;

    }


    return {

        id:
            limparTexto(
                pegar(
                    linha,
                    "id"
                )
            )
            ||
            criarID(),

        codigo,

        marca:
            limparTexto(
                pegar(
                    linha,
                    "marca"
                )
            ),

        material:
            limparTexto(
                pegar(
                    linha,
                    "material"
                )
            ),

        cor:
            limparTexto(
                pegar(
                    linha,
                    "cor"
                )
            ),

        diametro:
            numeroBR(
                pegar(
                    linha,
                    "diametro",
                    "diâmetro"
                )
            )
            ||
            1.75,

        pesoOriginal:
            pesoOriginal,

        pesoRestante:
            Math.max(
                0,
                pesoRestante
            ),

        valorPago:
            numeroBR(
                pegar(
                    linha,
                    "valorPago",
                    "valor pago",
                    "preco",
                    "preço"
                )
            ),

        limiteBaixo:
            numeroBR(
                pegar(
                    linha,
                    "limiteBaixo",
                    "limite baixo",
                    "estoque minimo",
                    "estoque mínimo"
                )
            )
            ||
            200,

        observacoes:
            limparTexto(
                pegar(
                    linha,
                    "observacoes",
                    "observações"
                )
            ),

        atualizado_em:
            new Date()
                .toISOString()

    };

}


function importarFilamentos(
    linhas,
    modo
) {

    const atuais =
        lerLocal(
            STORAGE_KEYS.filamentos
        );


    const importados =

        linhas

        .map(
            converterFilamento
        )

        .filter(Boolean);


    if (
        !importados.length
    ) {

        throw new Error(
            "Nenhum filamento válido foi encontrado."
        );

    }


    let resultado =
        modo ===
        "substituir"

        ? []

        : [
            ...atuais
        ];


    for (
        const filamento
        of importados
    ) {

        const indice =

            resultado

            .findIndex(

                atual =>

                    String(
                        atual.id ||
                        ""
                    )

                    ===

                    String(
                        filamento.id ||
                        ""
                    )

                    ||

                    codigoFilamento(
                        atual.codigo
                    )

                    ===

                    filamento.codigo

            );


        if (
            indice >=
            0
        ) {

            resultado[
                indice
            ] = {

                ...resultado[
                    indice
                ],

                ...filamento,

                id:
                    resultado[
                        indice
                    ].id
                    ||
                    filamento.id

            };

        } else {

            resultado.push(
                filamento
            );

        }

    }


    salvarLocal(

        STORAGE_KEYS.filamentos,

        resultado

    );


    return {

        importados:
            importados.length,

        total:
            resultado.length

    };

}


/* ==========================================================
   CUSTOS
========================================================== */


function converterCusto(
    linha
) {

    const descricao =
        limparTexto(
            pegar(
                linha,
                "descricao",
                "descrição"
            )
        );


    if (!descricao) {

        return null;

    }


    return {

        id:
            limparTexto(
                pegar(
                    linha,
                    "id"
                )
            )
            ||
            criarID(),

        descricao,

        categoria:
            limparTexto(
                pegar(
                    linha,
                    "categoria"
                )
            ),

        tipo:
            limparTexto(
                pegar(
                    linha,
                    "tipo"
                )
            )
            ||
            "Variável",

        valor:
            numeroBR(
                pegar(
                    linha,
                    "valor"
                )
            ),

        data:
            limparTexto(
                pegar(
                    linha,
                    "data"
                )
            )
            ||
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                ),

        observacoes:
            limparTexto(
                pegar(
                    linha,
                    "observacoes",
                    "observações"
                )
            ),

        atualizado_em:
            new Date()
                .toISOString()

    };

}


function importarCustos(
    linhas,
    modo
) {

    const atuais =
        lerLocal(
            STORAGE_KEYS.custos
        );


    const importados =

        linhas

        .map(
            converterCusto
        )

        .filter(Boolean);


    if (
        !importados.length
    ) {

        throw new Error(
            "Nenhum custo válido foi encontrado."
        );

    }


    let resultado =
        modo ===
        "substituir"

        ? []

        : [
            ...atuais
        ];


    for (
        const custo
        of importados
    ) {

        const indice =

            resultado

            .findIndex(

                atual =>

                    custo.id &&
                    atual.id &&
                    String(
                        custo.id
                    ) ===
                    String(
                        atual.id
                    )

            );


        if (
            indice >=
            0
        ) {

            resultado[
                indice
            ] = {

                ...resultado[
                    indice
                ],

                ...custo

            };

        } else {

            resultado.push(
                custo
            );

        }

    }


    salvarLocal(

        STORAGE_KEYS.custos,

        resultado

    );


    return {

        importados:
            importados.length,

        total:
            resultado.length

    };

}


/* ==========================================================
   PEDIDOS
========================================================== */


function converterPedido(
    linha
) {

    const cliente =
        limparTexto(
            pegar(
                linha,
                "cliente",
                "nome cliente"
            )
        );


    if (!cliente) {

        return null;

    }


    return {

        id:
            limparTexto(
                pegar(
                    linha,
                    "id"
                )
            )
            ||
            criarID(),

        cliente,

        contato:
            limparTexto(
                pegar(
                    linha,
                    "contato",
                    "telefone",
                    "whatsapp"
                )
            ),

        itens:
            limparTexto(
                pegar(
                    linha,
                    "itens",
                    "produtos",
                    "produto"
                )
            ),

        valor:
            numeroBR(
                pegar(
                    linha,
                    "valor",
                    "total"
                )
            ),

        status:
            limparTexto(
                pegar(
                    linha,
                    "status"
                )
            )
            ||
            "Novo",

        data:
            limparTexto(
                pegar(
                    linha,
                    "data"
                )
            )
            ||
            new Date()
                .toISOString(),

        atualizado_em:
            new Date()
                .toISOString()

    };

}


function importarPedidos(
    linhas,
    modo
) {

    const atuais =
        lerLocal(
            STORAGE_KEYS.pedidos
        );


    const importados =

        linhas

        .map(
            converterPedido
        )

        .filter(Boolean);


    if (
        !importados.length
    ) {

        throw new Error(
            "Nenhum pedido válido foi encontrado."
        );

    }


    let resultado =
        modo ===
        "substituir"

        ? []

        : [
            ...atuais
        ];


    for (
        const pedido
        of importados
    ) {

        const indice =

            resultado

            .findIndex(

                atual =>

                    pedido.id &&
                    atual.id &&
                    String(
                        pedido.id
                    ) ===
                    String(
                        atual.id
                    )

            );


        if (
            indice >=
            0
        ) {

            resultado[
                indice
            ] = {

                ...resultado[
                    indice
                ],

                ...pedido

            };

        } else {

            resultado.push(
                pedido
            );

        }

    }


    salvarLocal(

        STORAGE_KEYS.pedidos,

        resultado

    );


    return {

        importados:
            importados.length,

        total:
            resultado.length

    };

}


/* ==========================================================
   IMPORTAÇÃO
========================================================== */


async function executarImportacao() {

    const input =
        $("#csv-arquivo");


    const arquivo =
        input?.files?.[0];


    if (!arquivo) {

        mostrarStatus(
            "Selecione um arquivo CSV.",
            "erro"
        );

        return;

    }


    const tipo =
        $("#csv-tipo")
            .value;


    const modo =
        $("#csv-modo")
            .value;


    if (
        modo ===
        "substituir"
    ) {

        const nome =
            TIPOS[
                tipo
            ]?.nome ||
            tipo;


        const confirmar =
            window.confirm(

                `ATENÇÃO!\n\n` +

                `Você escolheu SUBSTITUIR todos os dados de ${nome}.\n\n` +

                `Os dados atuais desse módulo serão substituídos pelo conteúdo do CSV.\n\n` +

                `Deseja continuar?`

            );


        if (!confirmar) {

            return;

        }

    }


    try {

        mostrarStatus(
            "Lendo arquivo...",
            "processando"
        );


        const texto =
            await arquivo.text();


        const linhas =
            parseCSV(
                texto
            );


        mostrarStatus(
            `${linhas.length} linha(s) encontrada(s). Importando...`,
            "processando"
        );


        let resultado;


        if (
            tipo ===
            "produtos"
        ) {

            resultado =
                await importarProdutos(
                    linhas,
                    modo
                );

        }


        else if (
            tipo ===
            "filamentos"
        ) {

            resultado =
                importarFilamentos(
                    linhas,
                    modo
                );

        }


        else if (
            tipo ===
            "custos"
        ) {

            resultado =
                importarCustos(
                    linhas,
                    modo
                );

        }


        else if (
            tipo ===
            "pedidos"
        ) {

            resultado =
                importarPedidos(
                    linhas,
                    modo
                );

        }


        else {

            throw new Error(
                "Tipo de importação inválido."
            );

        }


        mostrarStatus(

            `${resultado.importados} registro(s) importado(s). ` +

            `Total atual: ${resultado.total}. ` +

            `Atualizando painel...`,

            "sucesso"

        );


        setTimeout(

            () => {

                window.location.reload();

            },

            1400

        );


    } catch (
        erro
    ) {

        console.error(
            erro
        );


        mostrarStatus(

            "Erro na importação: " +
            (
                erro.message ||
                "erro desconhecido"
            ),

            "erro"

        );

    }

}


/* ==========================================================
   MODELO CSV
========================================================== */


function escaparCSV(
    valor
) {

    return (

        '"' +

        String(
            valor ?? ""
        )

        .replaceAll(
            '"',
            '""'
        )

        +

        '"'

    );

}


function baixarModelo() {

    const tipo =
        $("#csv-tipo")
            .value;


    const configuracao =
        TIPOS[
            tipo
        ];


    if (!configuracao) {

        return;

    }


    const conteudo =

        "\uFEFF"

        +

        configuracao.colunas

        .map(
            escaparCSV
        )

        .join(
            ";"
        )

        +

        "\r\n"

        +

        configuracao.exemplo

        .map(
            escaparCSV
        )

        .join(
            ";"
        );


    const blob =
        new Blob(

            [
                conteudo
            ],

            {
                type:
                    "text/csv;charset=utf-8"
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

        `modelo-${tipo}-criaitor3d.csv`;


    document.body
        .appendChild(
            link
        );


    link.click();

    link.remove();


    setTimeout(

        () => {

            URL.revokeObjectURL(
                url
            );

        },

        1000

    );

}


/* ==========================================================
   INTERFACE
========================================================== */


function criarInterface() {

    const pagina =
        $("#publicar");


    if (!pagina) {

        return;

    }


    if (
        $("#painel-importar-csv")
    ) {

        return;

    }


    const painel =
        document.createElement(
            "div"
        );


    painel.className =
        "painel";


    painel.id =
        "painel-importar-csv";


    painel.innerHTML = `

        <div class="csv-cabecalho">

            <div>

                <span class="subtitulo">
                    IMPORTAÇÃO DE DADOS
                </span>

                <h2>
                    Importar CSV
                </h2>

                <p>
                    Importe dados do Excel,
                    LibreOffice ou outro sistema.
                    Aceita arquivos separados por
                    ponto e vírgula ou vírgula.
                </p>

            </div>

        </div>


        <div class="csv-grid">

            <label class="campo">

                <span>
                    O que deseja importar?
                </span>

                <select id="csv-tipo">

                    <option value="produtos">
                        Produtos
                    </option>

                    <option value="filamentos">
                        Filamentos
                    </option>

                    <option value="custos">
                        Custos
                    </option>

                    <option value="pedidos">
                        Pedidos
                    </option>

                </select>

            </label>


            <label class="campo">

                <span>
                    Modo de importação
                </span>

                <select id="csv-modo">

                    <option value="mesclar">
                        Mesclar com os dados atuais
                    </option>

                    <option value="substituir">
                        Substituir todos os dados
                    </option>

                </select>

            </label>

        </div>


        <div class="csv-arquivo-area">

            <label
                class="csv-arquivo-label"
                for="csv-arquivo"
            >

                <strong>
                    Selecionar arquivo CSV
                </strong>

                <span>
                    Clique aqui e escolha o arquivo
                    .csv no computador
                </span>

            </label>


            <input
                id="csv-arquivo"
                type="file"
                accept=".csv,text/csv"
                hidden
            >


            <div
                id="csv-arquivo-nome"
                class="csv-arquivo-nome"
            >
                Nenhum arquivo selecionado
            </div>

        </div>


        <div class="csv-acoes">

            <button
                type="button"
                class="botao botao-secundario"
                id="csv-baixar-modelo"
            >
                Baixar modelo CSV
            </button>


            <button
                type="button"
                class="botao botao-laranja"
                id="csv-importar"
            >
                Importar CSV
            </button>

        </div>


        <div
            class="csv-status"
            id="csv-status"
        >
            Aguardando arquivo.
        </div>


        <div class="csv-ajuda">

            <strong>
                Como funciona o modo Mesclar?
            </strong>

            <p>
                Produtos existentes são identificados
                pelo ID ou pelo mesmo nome + categoria.
                Filamentos são identificados pelo ID
                ou pelo código, como 001.
                Assim você pode atualizar dados existentes
                sem criar duplicatas desnecessárias.
            </p>

        </div>

    `;


    /*
    Insere antes do painel de exportação/backup.
    */

    const paineis =
        pagina.querySelectorAll(
            ".painel"
        );


    if (
        paineis.length
    ) {

        paineis[0]
            .after(
                painel
            );

    } else {

        pagina.appendChild(
            painel
        );

    }


    criarCSS();


    $("#csv-arquivo")
        .addEventListener(

            "change",

            evento => {

                const arquivo =
                    evento.target
                        .files?.[0];


                $("#csv-arquivo-nome")
                    .textContent =

                    arquivo
                        ? arquivo.name
                        : "Nenhum arquivo selecionado";


                mostrarStatus(
                    arquivo
                        ? "Arquivo pronto para importação."
                        : "Aguardando arquivo."
                );

            }

        );


    $("#csv-importar")
        .addEventListener(

            "click",

            executarImportacao

        );


    $("#csv-baixar-modelo")
        .addEventListener(

            "click",

            baixarModelo

        );


    $("#csv-tipo")
        .addEventListener(

            "change",

            () => {

                $("#csv-arquivo")
                    .value =
                    "";


                $("#csv-arquivo-nome")
                    .textContent =
                    "Nenhum arquivo selecionado";


                mostrarStatus(
                    "Aguardando arquivo."
                );

            }

        );

}


/* ==========================================================
   CSS DO IMPORTADOR
========================================================== */


function criarCSS() {

    if (
        $("#css-importar-csv")
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "css-importar-csv";


    style.textContent = `

        .csv-cabecalho{
            margin-bottom:20px;
        }


        .csv-cabecalho h2{
            margin:
                7px 0
                4px;
        }


        .csv-cabecalho p{
            max-width:
                800px;
        }


        .csv-grid{
            display:grid;

            grid-template-columns:
                repeat(
                    2,
                    minmax(
                        0,
                        1fr
                    )
                );

            gap:
                15px;

            margin-bottom:
                18px;
        }


        .csv-arquivo-area{
            margin-top:
                10px;

            padding:
                20px;

            background:
                #191221;

            border:
                2px dashed
                #74478a;

            border-radius:
                13px;
        }


        .csv-arquivo-label{
            min-height:
                110px;

            display:flex;

            flex-direction:
                column;

            align-items:
                center;

            justify-content:
                center;

            gap:
                7px;

            cursor:
                pointer;

            text-align:
                center;
        }


        .csv-arquivo-label strong{
            color:
                #ff8927;

            font-size:
                16px;
        }


        .csv-arquivo-label span{
            color:
                #b8a8c3;

            font-size:
                12px;
        }


        .csv-arquivo-nome{
            margin-top:
                10px;

            padding-top:
                10px;

            border-top:
                1px solid
                #493550;

            color:
                #d7c7df;

            text-align:
                center;

            font-size:
                12px;
        }


        .csv-acoes{
            display:flex;

            flex-wrap:
                wrap;

            gap:
                10px;

            margin-top:
                18px;
        }


        .csv-status{
            margin-top:
                17px;

            padding:
                12px 14px;

            background:
                #252032;

            color:
                #cbbbd3;

            border:
                1px solid
                #4e3a58;

            border-radius:
                9px;

            font-size:
                12px;
        }


        .csv-status.sucesso{
            background:
                #163023;

            color:
                #91e4b1;

            border-color:
                #37684b;
        }


        .csv-status.erro{
            background:
                #402027;

            color:
                #ffbcbc;

            border-color:
                #8e4f59;
        }


        .csv-status.processando{
            background:
                #30253b;

            color:
                #d267ff;

            border-color:
                #74478a;
        }


        .csv-ajuda{
            margin-top:
                18px;

            padding:
                15px;

            background:
                #191221;

            border:
                1px solid
                #493550;

            border-radius:
                10px;
        }


        .csv-ajuda strong{
            color:
                #d267ff;
        }


        .csv-ajuda p{
            margin-bottom:
                0;

            font-size:
                12px;
        }


        @media(max-width:760px){

            .csv-grid{
                grid-template-columns:
                    1fr;
            }


            .csv-acoes{
                flex-direction:
                    column;
            }


            .csv-acoes .botao{
                width:
                    100%;
            }

        }

    `;


    document.head
        .appendChild(
            style
        );

}


/* ==========================================================
   INICIALIZAÇÃO
========================================================== */


function iniciar() {

    criarInterface();

}


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


window.CRIAITOR_CSV = {

    parseCSV,

    importarProdutos,

    importarFilamentos,

    importarCustos,

    importarPedidos

};


})();
