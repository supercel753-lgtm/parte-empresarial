"use strict";


const SUPABASE_URL =
    "https://odmshtzmvtgkuxnysqor.supabase.co";


const SUPABASE_PUBLIC_KEY =
    "sb_publishable_iGeAejP8oNb0hUy7FhThIQ_MMbzZV2c";


if (!window.supabase) {

    throw new Error(
        "Biblioteca do Supabase não carregada."
    );

}


window.sb =
    window.supabase.createClient(

        SUPABASE_URL,

        SUPABASE_PUBLIC_KEY,

        {

            auth: {

                persistSession:
                    false,

                autoRefreshToken:
                    false,

                detectSessionInUrl:
                    false

            }

        }

    );


window.CRIAITOR_SUPABASE_CONFIG =
    Object.freeze({

        tabelaCatalogo:
            "catalogo",

        registroCatalogo:
            1,

        bucket:
            "projetos",

        pastaImagens:
            "catalogo"

    });
