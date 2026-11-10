/** Testes de sintaxe, utilidades e importação, sem dependências npm. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const jsDir = path.join(root, 'src');
const scripts = ['supabase-config.js', 'catalogo.js', 'admin-sem-login.js',
                 'fotos-empresa.js', 'sync-empresa.js', 'importar-csv.js'];
let chamadasSupabase = 0;
const items = new Map();
const cliente = {
  from(){ throw Error('Consulta remota não prevista neste teste.'); },
  channel(){ return { on(){ return this; }, subscribe(){ return this; } }; },
};
const window = {
  supabase: { createClient(url, key) { assert(url.startsWith('https://')); assert(key.startsWith('sb_publishable_')); chamadasSupabase++; return cliente; } },
  crypto: {randomUUID:()=> 'test-id-123'},
  addEventListener(){},
};
const document = { readyState: 'loading', addEventListener(){},
  querySelector(){return null;}, querySelectorAll(){return [];} };
const localStorage = {
  getItem(k){return items.has(k)?items.get(k):null;},
  setItem(k,v){items.set(k,String(v));},
  removeItem(k){items.delete(k);}
};
const ctx = vm.createContext({window,document,localStorage,console,JSON,Date,Math,
  setInterval(){},setTimeout(){},clearTimeout(){},crypto:window.crypto,
  confirm(){return true;},Blob,URL,Event:class{},Intl});
for (const name of scripts){
  const content=fs.readFileSync(path.join(jsDir,name),'utf8');
  new vm.Script(content,{filename:name});
  vm.runInContext(content,ctx,{filename:name});
}
assert.equal(chamadasSupabase,1,'O cliente Supabase deve ser criado uma vez.');
assert(window.CRIAITOR_ADMIN,'API de administração não foi disponibilizada.');
assert(window.CRIAITOR_FOTOS === undefined,'Fotos só devem iniciar quando houver formulário.');
assert(window.CRIAITOR_CSV,'Importador CSV não foi disponibilizado.');
assert(window.CRIAITOR_CATALOGO_UTILS,'Utilitário de catálogo indisponível.');

const normalizado=window.CRIAITOR_CATALOGO_UTILS.normalizarProduto({
  nome:'  Peça teste  ', preco:19.90, estoque:-2, destaque:true});
assert.equal(normalizado.nome,'Peça teste');
assert.equal(normalizado.preco,19.9);
assert.equal(normalizado.estoque,0);
assert.equal(normalizado.destaque,true);

const linhas=window.CRIAITOR_CSV.parseCSV('\uFEFFnome;categoria;descricao;preco\r\n"Peça; especial";Decoração;"Uma linha\ne outra";19,90\r\n');
assert.equal(linhas.length,1);
assert.equal(linhas[0].nome,'Peça; especial');
assert.equal(linhas[0].descricao,'Uma linha\ne outra');
assert.throws(() => window.CRIAITOR_CSV.parseCSV('nome;descricao\nTeste;"não fechado'), /aspas/);

const testeFilamento=window.CRIAITOR_CSV.parseCSV('codigo;marca;material;cor;pesoOriginal;pesoRestante;valorPago\n1;Marca;PETG;Branco;1000;850;120,50\n');
const importado=window.CRIAITOR_CSV.importarFilamentos(testeFilamento,'substituir');
assert.equal(importado.total,1);
const filamentos=JSON.parse(items.get('criaitor3d_filamentos'));
assert.equal(filamentos[0].codigo,'001');
assert.equal(filamentos[0].pesoRestante,850);
assert.equal(filamentos[0].valorPago,120.5);

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const urls=Array.from(html.matchAll(/<script\s+src="([^"]+)"/g),m=>m[1].split('?')[0]);
assert.equal(urls.length,7,'Sete scripts: biblioteca + seis módulos.');
assert.equal(new Set(urls).size,urls.length,'Há scripts duplicados no HTML.');
for (const src of urls.slice(1)) assert(fs.existsSync(path.join(root,src)),'Script não encontrado: '+src);
const pagina=['dashboard','produtos','pedidos','precificacao','custos','filamentos','publicar'];
for(const id of pagina) assert(html.includes(`id="${id}"`),'Seção não encontrada: '+id);
console.log('OK: sintaxe dos módulos, Supabase único, cadastro normalizado, CSV com aspas/quebras, estoque e páginas.');
