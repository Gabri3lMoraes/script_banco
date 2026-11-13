# Supabase keep-alive

Consulta cada projeto Supabase a cada 2 dias pelo GitHub Actions, para o plano gratuito não pausar.
Funciona com projetos de várias contas diferentes.

## 1. Em cada projeto Supabase
1. Abra **SQL Editor → New query**, cole o conteúdo de `setup.sql` e clique em **Run**.
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon / publishable**.
   Nunca use a `service_role` / `secret`.

## 2. No GitHub
1. Crie um repositório **privado** (ex.: `supabase-keepalive`) e envie esta pasta.
2. **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `SUPABASE_PROJECTS`
   - Valor: um JSON como o de `projetos.example.json`, com seus projetos.
3. **Settings → Actions → General → Workflow permissions**: marque **Read and write permissions**
   (necessário para o commit mensal).
4. Aba **Actions → Supabase keep-alive → Run workflow** para testar. Tudo verde = pronto.

Para incluir ou tirar um projeto, edite só o secret `SUPABASE_PROJECTS`.

## Testar no PC (opcional)
Copie `projetos.example.json` para `projetos.json`, preencha e rode:

```
node ping.js
```

`projetos.json` está no `.gitignore` e não vai para o GitHub.

## Se der falha
- **404 / PGRST205**: faltou rodar `setup.sql` naquele projeto.
- **401**: chave errada.
- **timeout**: o projeto provavelmente já está pausado; reative no painel do Supabase.

O GitHub manda e-mail quando uma execução falha.
