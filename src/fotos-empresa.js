(function () {

"use strict";


const sb =
    window.sb;


const configuracao =
    window.CRIAITOR_SUPABASE_CONFIG ||
    {};


const CONFIG = {

    bucket:
        configuracao.bucket ||
        "projetos",

    pasta:
        configuracao.pastaImagens ||
        "catalogo",

    max:
        5 * 1024 * 1024

};


const TIPOS = {

    "image/jpeg":
        "jpg",

    "image/png":
        "png",

    "image/webp":
        "webp"

};


const formulario =
    document.querySelector(
        "#form-produto"
    );


if (!formulario) {

    return;

}


const campoImagem =

    formulario.querySelector(
        '[name="imagem"]'
    );


if (!campoImagem) {

    return;

}


const estado = {

    arquivo:
        null,

    enviando:
        false,

    previewLocal:
        null

};


function criarID() {

    return window.crypto
        ?.randomUUID

        ? crypto.randomUUID()

        : (

            Date.now()
                .toString(36)

            +

            Math.random()
                .toString(36)
                .slice(2)

        );

}


const area =
    document.createElement(
        "div"
    );


area.className =
    "area-fotos-empresa";


area.innerHTML = `

    <div
        class="zona-upload"
        id="zona-upload-produto"
        tabindex="0"
        role="button"
    >

        <div class="icone-upload">
            +
        </div>

        <strong>
            Fotografia do produto
        </strong>

        <span>
            Arraste, clique para selecionar
            ou cole com Ctrl+V.
        </span>

        <span class="botao-escolher-foto">
            Selecionar imagem
        </span>

        <small>
            JPG, PNG ou WEBP • máximo 5 MB
        </small>

    </div>


    <input
        type="file"
        id="arquivo-foto-produto"
        accept="image/jpeg,image/png,image/webp"
        hidden
    >


    <div
        class="preview-container"
        id="preview-container-foto"
        hidden
    >

        <img
            id="preview-foto"
            alt="Pré-visualização"
        >

        <div class="preview-informacoes">

            <span
                class="status-foto"
                id="status-foto"
            >
                Imagem selecionada
            </span>

            <button
                type="button"
                class="botao-trocar-foto"
                id="trocar-foto-produto"
            >
                Trocar imagem
            </button>

        </div>

    </div>

`;


const campoLegado =
    campoImagem.closest(
        ".campo-url-legado"
    );


if (campoLegado) {

    campoLegado.before(
        area
    );


} else {

    campoImagem.before(
        area
    );

}


const zona =
    area.querySelector(
        "#zona-upload-produto"
    );


const input =
    area.querySelector(
        "#arquivo-foto-produto"
    );


const previewContainer =
    area.querySelector(
        "#preview-container-foto"
    );


const preview =
    area.querySelector(
        "#preview-foto"
    );


const status =
    area.querySelector(
        "#status-foto"
    );


const trocar =
    area.querySelector(
        "#trocar-foto-produto"
    );


function setStatus(

    mensagem,

    erro = false

) {

    status.textContent =
        mensagem;


    status.classList.toggle(

        "erro",

        erro

    );

}


function liberarPreview() {

    if (

        estado.previewLocal

    ) {

        URL.revokeObjectURL(
            estado.previewLocal
        );


        estado.previewLocal =
            null;

    }

}


function mostrarPreview(
    url
) {

    previewContainer.hidden =
        !url;


    if (url) {

        preview.src =
            url;


    } else {

        preview.removeAttribute(
            "src"
        );

    }

}


function sincronizar() {

    if (

        estado.arquivo

    ) {

        return;

    }


    liberarPreview();


    mostrarPreview(

        campoImagem.value
            .trim()

    );


    if (

        campoImagem.value
            .trim()

    ) {

        setStatus(
            "Fotografia atual do produto"
        );

    }

}


function validar(
    arquivo
) {

    if (!arquivo) {

        throw new Error(
            "Nenhuma imagem selecionada."
        );

    }


    if (

        !TIPOS[
            arquivo.type
        ]

    ) {

        throw new Error(
            "Use JPG, PNG ou WEBP."
        );

    }


    if (

        arquivo.size >
        CONFIG.max

    ) {

        throw new Error(
            "A imagem deve ter no máximo 5 MB."
        );

    }

}


function selecionar(
    arquivo
) {

    try {

        validar(
            arquivo
        );


        liberarPreview();


        estado.arquivo =
            arquivo;


        estado.previewLocal =
            URL.createObjectURL(
                arquivo
            );


        mostrarPreview(
            estado.previewLocal
        );


        setStatus(
            `${arquivo.name} selecionada`
        );


    } catch (
        erro
    ) {

        setStatus(

            erro.message,

            true

        );

    }

}


async function enviar() {

    if (

        !estado.arquivo

    ) {

        return campoImagem
            .value
            .trim();

    }


    if (!sb) {

        throw new Error(
            "Supabase não inicializado."
        );

    }


    validar(
        estado.arquivo
    );


    estado.enviando =
        true;


    zona.classList.add(
        "enviando"
    );


    setStatus(
        "Enviando fotografia..."
    );


    try {

        const caminho =

            `${CONFIG.pasta}/${criarID()}.${
                TIPOS[
                    estado.arquivo.type
                ]
            }`;


        const {
            data,
            error
        } = await sb.storage

            .from(
                CONFIG.bucket
            )

            .upload(

                caminho,

                estado.arquivo,

                {

                    contentType:
                        estado.arquivo.type,

                    cacheControl:
                        "3600",

                    upsert:
                        false

                }

            );


        if (error) {

            throw error;

        }


        const url =

            sb.storage

            .from(
                CONFIG.bucket
            )

            .getPublicUrl(
                data.path
            )

            .data
            ?.publicUrl;


        if (!url) {

            throw new Error(
                "Não foi possível obter a URL."
            );

        }


        campoImagem.value =
            url;


        estado.arquivo =
            null;


        liberarPreview();


        mostrarPreview(
            url
        );


        setStatus(
            "Fotografia enviada ao Supabase"
        );


        campoImagem.dispatchEvent(

            new Event(

                "change",

                {
                    bubbles:
                        true
                }

            )

        );


        return url;


    } catch (
        erro
    ) {

        console.error(
            erro
        );


        setStatus(

            "Erro no envio: " +
            erro.message,

            true

        );


        throw erro;


    } finally {

        estado.enviando =
            false;


        zona.classList.remove(
            "enviando"
        );

    }

}


zona.addEventListener(

    "click",

    () => {

        if (

            !estado.enviando

        ) {

            input.click();

        }

    }

);


trocar.addEventListener(

    "click",

    () => {

        if (

            !estado.enviando

        ) {

            input.click();

        }

    }

);


zona.addEventListener(

    "keydown",

    evento => {

        if (

            evento.key ===
            "Enter"

            ||

            evento.key ===
            " "

        ) {

            evento.preventDefault();

            input.click();

        }

    }

);


input.addEventListener(

    "change",

    () => {

        const arquivo =
            input.files?.[0];


        if (arquivo) {

            selecionar(
                arquivo
            );

        }


        input.value =
            "";

    }

);


[
    "dragenter",
    "dragover"
]

.forEach(

    tipo => {

        zona.addEventListener(

            tipo,

            evento => {

                evento.preventDefault();


                zona.classList.add(
                    "arrastando"
                );

            }

        );

    }

);


[
    "dragleave",
    "drop"
]

.forEach(

    tipo => {

        zona.addEventListener(

            tipo,

            evento => {

                evento.preventDefault();


                zona.classList.remove(
                    "arrastando"
                );

            }

        );

    }

);


zona.addEventListener(

    "drop",

    evento => {

        const arquivo =
            evento.dataTransfer
                ?.files?.[0];


        if (arquivo) {

            selecionar(
                arquivo
            );

        }

    }

);


document.addEventListener(

    "paste",

    evento => {

        if (

            !document
                .querySelector(
                    "#modal-produto"
                )
                ?.open

        ) {

            return;

        }


        const itemImagem =

            [
                ...(
                    evento.clipboardData
                        ?.items ||
                    []
                )
            ]

            .find(

                item =>
                    item.type
                        .startsWith(
                            "image/"
                        )

            );


        const arquivo =
            itemImagem
                ?.getAsFile();


        if (arquivo) {

            evento.preventDefault();


            selecionar(
                arquivo
            );

        }

    }

);


campoImagem.addEventListener(

    "change",

    sincronizar

);


formulario.addEventListener(

    "submit",

    async evento => {

        if (

            estado.enviando

        ) {

            evento.preventDefault();

            evento.stopImmediatePropagation();

            return;

        }


        if (

            !estado.arquivo

        ) {

            return;

        }


        evento.preventDefault();

        evento.stopImmediatePropagation();


        const botao =
            formulario.querySelector(
                '[type="submit"]'
            );


        if (botao) {

            botao.disabled =
                true;

        }


        try {

            await enviar();


            formulario.requestSubmit();


        } finally {

            if (botao) {

                botao.disabled =
                    false;

            }

        }

    },

    true

);


window.CRIAITOR_FOTOS = {

    temArquivoPendente:
        () =>
            Boolean(
                estado.arquivo
            ),

    enviando:
        () =>
            estado.enviando,

    obterImagem:
        () =>
            campoImagem.value,

    enviar,

    atualizarPreview:
        sincronizar,

    limpar:
        () => {

            estado.arquivo =
                null;

            liberarPreview();

            sincronizar();

        }

};


sincronizar();

})();
