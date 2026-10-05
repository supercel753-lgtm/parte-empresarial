(function () {

"use strict";


window.CRIAITOR_CATALOGO =

    Array.isArray(
        window.CRIAITOR_CATALOGO
    )

        ? window.CRIAITOR_CATALOGO

        : [];


window.CRIAITOR_CONFIG_CATALOGO =
    Object.freeze({

        empresa:
            "CriAItor 3D",

        tabela:
            "catalogo",

        registro:
            1,

        bucket:
            "projetos",

        pastaImagens:
            "catalogo"

    });


window.CRIAITOR_CATALOGO_UTILS =
    Object.freeze({

        normalizarProduto(
            produto = {}
        ) {

            return {

                ...produto,

                id:
                    produto.id ||
                    "",

                nome:
                    String(
                        produto.nome ||
                        ""
                    )
                    .trim(),

                categoria:
                    String(
                        produto.categoria ||
                        ""
                    )
                    .trim(),

                preco:
                    Number(
                        produto.preco
                    ) ||
                    0,

                estoque:

                    Math.max(

                        0,

                        Math.trunc(

                            Number(
                                produto.estoque
                            )

                            ||

                            0

                        )

                    ),

                disponivel:
                    produto.disponivel !==
                    false,

                destaque:
                    produto.destaque ===
                    true

            };

        }

    });

})();
