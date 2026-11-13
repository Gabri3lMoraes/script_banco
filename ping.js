// Keep-alive para projetos Supabase (plano gratuito pausa após ~7 dias sem atividade).
// Faz uma consulta real na tabela "keepalive" de cada projeto.
//
// Configuração (uma das duas):
//   - variável de ambiente SUPABASE_PROJECTS com um JSON (usado no GitHub Actions)
//   - arquivo projetos.json nesta pasta (para testar no seu PC; está no .gitignore)
//
// Formato: [{ "nome": "pizzaria", "url": "https://abc.supabase.co", "key": "eyJ... ou sb_publishable_..." }]

const fs = require("fs");
const path = require("path");

const TABELA = process.env.KEEPALIVE_TABLE || "keepalive";
const TIMEOUT_MS = 30000;
const TENTATIVAS = 3;

function carregarProjetos() {
  let bruto = process.env.SUPABASE_PROJECTS;
  if (!bruto) {
    const arquivo = path.join(__dirname, "projetos.json");
    if (fs.existsSync(arquivo)) bruto = fs.readFileSync(arquivo, "utf8");
  }
  if (!bruto || !bruto.trim()) {
    throw new Error("Nenhum projeto configurado: defina SUPABASE_PROJECTS ou crie projetos.json.");
  }
  let lista;
  try {
    lista = JSON.parse(bruto);
  } catch (e) {
    throw new Error("SUPABASE_PROJECTS/projetos.json não é um JSON válido: " + e.message);
  }
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new Error("A configuração precisa ser uma lista com pelo menos um projeto.");
  }
  lista.forEach((p, i) => {
    if (!p || !p.url || !p.key) throw new Error(`Projeto #${i + 1} sem "url" ou "key".`);
    p.nome = p.nome || p.url;
    p.url = String(p.url).replace(/\/+$/, "");
  });
  return lista;
}

async function pingar(projeto) {
  const headers = { apikey: projeto.key, Accept: "application/json" };
  // Chaves antigas (JWT "eyJ...") também vão no Authorization; as novas sb_publishable_ não.
  if (projeto.key.startsWith("eyJ")) headers.Authorization = `Bearer ${projeto.key}`;

  const url = `${projeto.url}/rest/v1/${TABELA}?select=id&limit=1`;
  let ultimoErro;
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const inicio = Date.now();
      const resp = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const ms = Date.now() - inicio;
      if (resp.ok) return { ok: true, status: resp.status, ms };
      const corpo = (await resp.text()).slice(0, 200);
      ultimoErro = `HTTP ${resp.status} ${corpo}`;
      // 4xx (exceto 429) não melhora tentando de novo
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) break;
    } catch (e) {
      ultimoErro = e.name === "TimeoutError" ? `timeout de ${TIMEOUT_MS / 1000}s` : e.message;
    }
    if (t < TENTATIVAS) await new Promise((r) => setTimeout(r, 5000 * t));
  }
  return { ok: false, erro: ultimoErro };
}

async function main() {
  const projetos = carregarProjetos();
  console.log(`Pingando ${projetos.length} projeto(s) na tabela "${TABELA}"...\n`);

  const resultados = await Promise.all(projetos.map(async (p) => ({ p, r: await pingar(p) })));

  let falhas = 0;
  for (const { p, r } of resultados) {
    if (r.ok) {
      console.log(`OK    ${p.nome}  (${r.status}, ${r.ms} ms)`);
    } else {
      falhas++;
      console.log(`FALHA ${p.nome}  -> ${r.erro}`);
    }
  }

  console.log(`\n${projetos.length - falhas}/${projetos.length} ok.`);
  if (falhas > 0) {
    console.log("Dica: 404/PGRST205 = falta rodar setup.sql; 401 = chave errada; timeout = projeto já pausado (reative no painel).");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
