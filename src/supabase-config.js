"use strict";


const SUPABASE_URL =
    "https://odmshtzmvtgkuxnysqor.supabase.co";


const SUPABASE_PUBLIC_KEY =
    "sb_publishable_iGeAejP8oNb0hUy7FhThIQ_MMbzZV2c";


// A interface continua disponível em modo de consulta local quando a CDN cai.
// A edição do catálogo exige uma conexão válida com o Supabase.
if (!window.supabase?.createClient) {
    console.warn("Supabase indisponível: catálogo online em modo de consulta.");
    window.sb = null;
} else {
    window.sb = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLIC_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );
}

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
