(function () {
"use strict";

const sb = window.sb;
const cfg = window.CRIAITOR_SUPABASE_CONFIG || {};
const db = window.CRIAITOR_DB;

const ACCEPT = ".csv,.tsv,.txt,.json,.xlsx,.xls,.xlsm,.ods,.docx,.pdf,text/csv,text/plain,application/json,application/pdf";
const MODULES = ["auto", "produtos", "filamentos", "custos", "pedidos", "documentos"];
const STORAGE_KEYS = {
    filamentos: "criaitor3d_filamentos",
    custos: "criaitor3d_custos",
    pedidos: "criaitor3d_pedidos"
};

function $(q) { return document.querySelector(q); }
function norm(v) {
    return String(v ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function status(msg, tipo="") {
    const el = $("#arquivo-status");
    if (!el) return;
    el.textContent = msg;
    el.className = `arquivo-status ${tipo}`.trim();
}
function escapeHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function rowsFromDelimited(texto) {
    const csv = window.CRIAITOR_CSV;
    if (!csv?.parseCSV) throw new Error("Parser CSV não carregado.");
    return csv.parseCSV(texto);
}

function detectDelimiterText(texto) {
    const first = String(texto).split(/\r?\n/).find(l => l.trim()) || "";
    const candidates = ["\t", ";", "|", ","];
    let best = null, count = 0;
    for (const d of candidates) {
        const c = first.split(d).length;
        if (c > count) { count = c; best = d; }
    }
    return count > 1 ? best : null;
}

function delimitedToCsv(texto) {
    const d = detectDelimiterText(texto);
    if (!d || d === ";" || d === ",") return texto;
    return String(texto).split(/\r?\n/).map(line => {
        const cells = line.split(d).map(v => `"${String(v).replace(/"/g,'""')}"`);
        return cells.join(";");
    }).join("\n");
}

function classifyRows(rows) {
    if (!rows?.length) return "documentos";
    const headers = new Set(Object.keys(rows[0]).map(norm));
    const has = (...xs) => xs.some(x => headers.has(norm(x)));
    if (has("cliente") && has("valor","total") && has("status","itens","produtos")) return "pedidos";
    if (has("codigo") && has("material") && has("pesoOriginal","peso original","pesoRestante")) return "filamentos";
    if (has("descricao","descrição") && has("categoria") && has("valor") && has("tipo","data")) return "custos";
    if (has("nome") && has("categoria") && has("preco","preço","estoque")) return "produtos";
    return "documentos";
}

async function extractPdf(file) {
    const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages = [];
    for (let n=1; n<=pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        pages.push(content.items.map(i => i.str).join(" "));
    }
    return pages.join("\n");
}

async function extractDocx(file) {
    if (!window.mammoth) throw new Error("Biblioteca DOCX não carregada.");
    const { value } = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value || "";
}

async function parseFile(file) {
    const ext = file.name.toLowerCase().split(".").pop();
    if (["csv","tsv","txt"].includes(ext)) {
        const text = await file.text();
        const csvText = delimitedToCsv(text);
        let rows = [];
        try { rows = rowsFromDelimited(csvText); } catch {}
        return { rows, text, kind: ext };
    }
    if (ext === "json") {
        const text = await file.text();
        const json = JSON.parse(text);
        let rows = [];
        if (Array.isArray(json)) rows = json;
        else if (json && typeof json === "object") {
            for (const key of ["produtos","filamentos","custos","pedidos","dados","rows"]) {
                if (Array.isArray(json[key])) { rows = json[key]; break; }
            }
            if (!rows.length) rows = [json];
        }
        return { rows, text, kind: ext };
    }
    if (["xlsx","xls","xlsm","ods"].includes(ext)) {
        if (!window.XLSX) throw new Error("Biblioteca Excel não carregada.");
        const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = window.XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
        const text = window.XLSX.utils.sheet_to_csv(ws, { FS: ";" });
        return { rows, text, kind: ext };
    }
    if (ext === "docx") {
        const text = await extractDocx(file);
        let rows = [];
        try { rows = rowsFromDelimited(delimitedToCsv(text)); } catch {}
        return { rows, text, kind: ext };
    }
    if (ext === "pdf") {
        const text = await extractPdf(file);
        let rows = [];
        try { rows = rowsFromDelimited(delimitedToCsv(text)); } catch {}
        return { rows, text, kind: ext };
    }
    throw new Error(`Formato não suportado: .${ext}`);
}

function sanitizeName(name) {
    return String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}

async function uploadOriginal(file) {
    if (!sb) throw new Error("Supabase não disponível.");
    const now = new Date();
    const path = `${cfg.pastaImportacoes || "importacoes"}/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${Date.now()}-${sanitizeName(file.name)}`;
    const { error } = await sb.storage.from(cfg.bucket || "projetos").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    return path;
}

async function importStructured(tipo, rows, modo) {
    const api = window.CRIAITOR_CSV;
    if (!api) throw new Error("Importador estruturado não carregado.");
    let result;
    if (tipo === "produtos") result = await api.importarProdutos(rows, modo);
    else if (tipo === "filamentos") result = await Promise.resolve(api.importarFilamentos(rows, modo));
    else if (tipo === "custos") result = await Promise.resolve(api.importarCustos(rows, modo));
    else if (tipo === "pedidos") result = await Promise.resolve(api.importarPedidos(rows, modo));
    else return { importados: 0, total: 0 };

    if (tipo !== "produtos" && db && STORAGE_KEYS[tipo]) {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEYS[tipo]) || "[]");
        await db.salvarModulo(tipo, local);
    }
    return result;
}

async function processOne(file, selectedType, mode, upload) {
    const parsed = await parseFile(file);
    const detected = selectedType === "auto" ? classifyRows(parsed.rows) : selectedType;
    let storagePath = null;
    if (upload) storagePath = await uploadOriginal(file);

    let imported = { importados: 0, total: 0 };
    if (detected !== "documentos") {
        if (!parsed.rows.length) throw new Error(`Não encontrei tabela estruturada em ${file.name}.`);
        imported = await importStructured(detected, parsed.rows, mode);
    }

    const meta = {
        nome: file.name,
        tamanho: file.size,
        mime: file.type || "application/octet-stream",
        formato: parsed.kind,
        modulo: detected,
        storage_path: storagePath,
        registros: imported.importados || 0,
        texto_extraido: parsed.text ? parsed.text.slice(0, 50000) : ""
    };
    if (db) await db.registrarImportacao(meta);
    return { ...meta, total: imported.total || 0 };
}

async function execute() {
    const input = $("#arquivo-universal");
    const files = [...(input?.files || [])];
    if (!files.length) return status("Selecione pelo menos um arquivo.", "erro");
    const type = $("#arquivo-tipo")?.value || "auto";
    const mode = $("#arquivo-modo")?.value || "mesclar";
    const upload = $("#arquivo-upload-original")?.checked !== false;

    if (mode === "substituir" && type !== "documentos") {
        if (!confirm("ATENÇÃO: o modo SUBSTITUIR apaga os dados atuais do módulo antes da importação. Continuar?")) return;
    }

    const results = [];
    for (let i=0;i<files.length;i++) {
        const file = files[i];
        status(`Processando ${i+1}/${files.length}: ${file.name}...`, "processando");
        try {
            results.push({ ok: true, result: await processOne(file, type, mode, upload) });
        } catch (error) {
            console.error(error);
            results.push({ ok: false, name: file.name, error: error.message || String(error) });
        }
    }
    const ok = results.filter(r => r.ok).length;
    const fail = results.length - ok;
    renderResults(results);
    status(`${ok} arquivo(s) processado(s) com sucesso${fail ? ` • ${fail} com erro` : ""}. Os dados estruturados foram enviados ao Supabase.`, fail ? "erro" : "sucesso");
}

function renderResults(results) {
    const el = $("#arquivo-resultados");
    if (!el) return;
    el.innerHTML = results.map(r => r.ok
        ? `<div class="arquivo-result ok"><strong>${escapeHtml(r.result.nome)}</strong><span>${escapeHtml(r.result.modulo)} • ${r.result.registros} registro(s)${r.result.storage_path ? " • original salvo" : ""}</span></div>`
        : `<div class="arquivo-result fail"><strong>${escapeHtml(r.name)}</strong><span>${escapeHtml(r.error)}</span></div>`
    ).join("");
}

function installUI() {
    const old = $("#painel-importar-csv");
    if (!old) return setTimeout(installUI, 100);
    old.id = "painel-importar-arquivos";
    old.innerHTML = `
      <div class="arquivo-head"><div><span class="subtitulo">IMPORTAÇÃO UNIVERSAL + SUPABASE</span><h2>Central de Importação</h2><p>CSV, Excel, TXT, JSON, DOCX e PDF. O arquivo original pode ser salvo no Storage e os dados reconhecidos são gravados no banco configurado.</p></div></div>
      <div class="arquivo-grid">
        <label class="campo"><span>Módulo de destino</span><select id="arquivo-tipo"><option value="auto">Detectar automaticamente</option><option value="produtos">Produtos</option><option value="filamentos">Filamentos</option><option value="custos">Custos</option><option value="pedidos">Pedidos</option><option value="documentos">Somente arquivar documento</option></select></label>
        <label class="campo"><span>Modo</span><select id="arquivo-modo"><option value="mesclar">Mesclar / atualizar</option><option value="substituir">Substituir módulo</option></select></label>
      </div>
      <label class="arquivo-drop" for="arquivo-universal"><strong>Selecionar arquivos</strong><span>CSV, TSV, TXT, JSON, XLS, XLSX, XLSM, ODS, DOCX ou PDF • aceita vários arquivos</span></label>
      <input id="arquivo-universal" type="file" accept="${ACCEPT}" multiple hidden>
      <div id="arquivo-lista" class="arquivo-lista">Nenhum arquivo selecionado.</div>
      <label class="arquivo-check"><input id="arquivo-upload-original" type="checkbox" checked> Salvar também o arquivo original no Supabase Storage</label>
      <div class="arquivo-actions"><button type="button" class="botao botao-laranja" id="arquivo-importar">Importar e sincronizar</button></div>
      <div id="arquivo-status" class="arquivo-status">Aguardando arquivos.</div>
      <div id="arquivo-resultados"></div>
      <div class="csv-ajuda"><strong>Como funciona?</strong><p>Planilhas e arquivos tabulares são convertidos para registros. DOCX/PDF são arquivados e têm o texto extraído; quando houver uma tabela reconhecível, também podem ser importados para o módulo escolhido. O histórico da importação fica registrado no Supabase.</p></div>
    `;

    const input = $("#arquivo-universal");
    input.addEventListener("change", () => {
        const files = [...input.files];
        $("#arquivo-lista").textContent = files.length ? files.map(f => `${f.name} (${Math.ceil(f.size/1024)} KB)`).join(" • ") : "Nenhum arquivo selecionado.";
    });
    $("#arquivo-importar").addEventListener("click", execute);
    installStyle();
}

function installStyle() {
    if ($("#css-importar-universal")) return;
    const style = document.createElement("style");
    style.id = "css-importar-universal";
    style.textContent = `
      .arquivo-head h2{margin:5px 0 8px}.arquivo-head p{max-width:850px;color:#bdb2c8}.arquivo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.arquivo-drop{display:flex;flex-direction:column;gap:7px;padding:26px;border:1px dashed #7c4c8e;border-radius:14px;background:#17101e;cursor:pointer;text-align:center}.arquivo-drop strong{color:#f28a35;font-size:16px}.arquivo-drop span,.arquivo-lista{color:#bfb3c7;font-size:12px}.arquivo-lista{padding:11px 2px;overflow-wrap:anywhere}.arquivo-check{display:flex;gap:9px;align-items:center;margin:8px 0 16px;color:#d9cfdf}.arquivo-actions{display:flex;gap:10px}.arquivo-status{margin-top:14px;padding:12px;border-radius:10px;background:#18111f;color:#c9bfd0}.arquivo-status.processando{color:#f0c06f}.arquivo-status.sucesso{color:#8ee5ac}.arquivo-status.erro{color:#ff9c9c}.arquivo-result{display:flex;justify-content:space-between;gap:20px;padding:10px 12px;margin-top:8px;border-radius:8px;background:#15101a}.arquivo-result span{color:#b7acbf;font-size:12px}.arquivo-result.fail{border-left:3px solid #e45b5b}.arquivo-result.ok{border-left:3px solid #55bf7a}@media(max-width:760px){.arquivo-grid{grid-template-columns:1fr}.arquivo-result{flex-direction:column;gap:4px}}
    `;
    document.head.appendChild(style);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installUI, { once: true });
else installUI();
})();
