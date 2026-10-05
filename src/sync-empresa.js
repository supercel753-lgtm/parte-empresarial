(function () {

"use strict";


const sb =
    window.sb;


const admin =
    window.CRIAITOR_ADMIN;


const configuracao =
    window.CRIAITOR_SUPABASE_CONFIG ||
    {};


const CONFIG = {

    tabela:

        configuracao.tabelaCatalogo ||
        "catalogo",

    registro:

        configuracao.registroCatalogo ||
        1,

    canal:
        "criaitor3d-sync-empresa"

};


let canal =
    null;


let verificando =
    false;


function status(

    mensagem,

    erro = false

) {

    const elemento =
        document.querySelector(
            "#status-sync"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        mensagem;


    elemento.style.color =

        erro

        ? "#ff9797"

        : "#91e4b1";

}


async function verificar() {

    if (

        !sb ||
        !admin ||
        verificando

    ) {

        return;

    }


    verificando =
        true;


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


        if (error) {

            throw error;

        }


        const remoto =
            Number(
                data.versao
            ) ||
            0;


        const local =
            Number(
                admin.getVersao()
            ) ||
            0;


        if (

            remoto !==
            local

        ) {

            status(
                "Nova versão encontrada. Atualizando..."
            );


            await admin.recarregar();


            status(
                `Sincronizado • versão ${remoto}`
            );


        } else {

            status(
                `Sincronizado • versão ${local}`
            );

        }


    } catch (
        erro
    ) {

        console.warn(
            erro
        );


        status(

            "Falha ao verificar sincronização",

            true

        );


    } finally {

        verificando =
            false;

    }

}


function iniciar() {

    if (

        !sb ||
        !admin

    ) {

        return;

    }


    if (!canal) {

        canal = sb

            .channel(
                CONFIG.canal
            )

            .on(

                "postgres_changes",

                {

                    event:
                        "UPDATE",

                    schema:
                        "public",

                    table:
                        CONFIG.tabela,

                    filter:
                        `id=eq.${CONFIG.registro}`

                },

                verificar

            )

            .subscribe(

                resultado => {

                    if (

                        resultado ===
                        "SUBSCRIBED"

                    ) {

                        status(
                            "Atualização automática ativa"
                        );

                    }

                }

            );

    }


    verificar();


    setInterval(

        verificar,

        30000

    );

}


document.addEventListener(

    "visibilitychange",

    () => {

        if (

            !document.hidden

        ) {

            verificar();

        }

    }

);


window.addEventListener(

    "online",

    verificar

);


window.addEventListener(

    "pageshow",

    verificar

);


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


window.CRIAITOR_SYNC = {

    verificar,

    recarregar:
        async () => {

            await admin.recarregar();

            await verificar();

        }

};

})();
