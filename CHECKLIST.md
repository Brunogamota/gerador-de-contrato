# Checklist de Validação Manual

Execute após cada deploy ou mudança estrutural.

## 1. Pré-requisitos

```bash
node scripts/smoke.mjs   # deve sair com código 0
```

- [ ] `DATABASE_URL` configurada e DB acessível
- [ ] `OPENAI_API_KEY` configurada (necessária apenas para import de PDF)

---

## 2. Fluxo de criação de contrato (`/contracts/new`)

**Passo 1 — Dados do Contratante**
- [ ] Formulário carrega sem erros de console
- [ ] "Continuar" sem preencher exibe erros de validação nos campos obrigatórios
- [ ] Máscara de CNPJ formata corretamente (XX.XXX.XXX/XXXX-XX)
- [ ] Máscara de telefone formata corretamente
- [ ] Com campos válidos, "Continuar" avança para o Passo 2

**Passo 2 — Tabela MDR**
- [ ] Botão "Continuar" fica desabilitado enquanto nenhuma bandeira está completa
- [ ] Preencher 12 células de uma bandeira habilita "Continuar"
- [ ] Aviso "Preencha ao menos uma bandeira completa" some após preencher

**Passo 3 — Taxas e Tarifas**
- [ ] Todos os 11 campos de taxas aparecem
- [ ] "Continuar" avança para o Passo 4

**Passo 4 — Prévia**
- [ ] Documento do contrato renderiza com os dados inseridos
- [ ] Nome do contratante aparece no cabeçalho e na assinatura
- [ ] Tabela MDR no Anexo II exibe os valores preenchidos
- [ ] Botão "Salvar Contrato" redireciona para `/contracts/{id}`
- [ ] Contrato salvo aparece na lista em `/contracts`

---

## 3. Import de PDF — parse-pdf (`/contracts/new` → Passo 2)

- [ ] Botão "Importar PDF" abre o modal
- [ ] Upload de arquivo não suportado (.txt, .docx) exibe erro de tipo
- [ ] Upload de PDF válido com tabela MDR preenche as células da matriz
- [ ] Indicador de confiança aparece (high / medium / low)
- [ ] Upload de imagem (.png) também funciona

---

## 4. API — sanity checks rápidos

Substitua `{BASE}` pela URL local (`http://localhost:3000`) ou de produção.

```bash
# Lista contratos (deve retornar array JSON)
curl -s {BASE}/api/contracts | jq 'length'

# Cria contrato mínimo (deve retornar 201 com id)
curl -s -X POST {BASE}/api/contracts \
  -H 'Content-Type: application/json' \
  -d @scripts/fixtures/contract-minimal.json | jq '.id'

# Busca por id (deve retornar 200)
curl -s {BASE}/api/contracts/{id} | jq '.contractNumber'

# PATCH — atualiza status (deve retornar 200)
curl -s -X PATCH {BASE}/api/contracts/{id} \
  -H 'Content-Type: application/json' \
  -d '{"status":"active"}' | jq '.status'

# PATCH — tentativa de sobrescrever campo protegido (deve ignorar id/contractNumber)
curl -s -X PATCH {BASE}/api/contracts/{id} \
  -H 'Content-Type: application/json' \
  -d '{"id":"hack","status":"signed"}' | jq '{id,status}'

# DELETE (deve retornar {ok: true})
curl -s -X DELETE {BASE}/api/contracts/{id} | jq '.ok'
```

---

## 5. Logs esperados no servidor

Ao criar um contrato, os logs devem incluir:
```
[contracts] POST contratante="ACME LTDA" cnpj=12.345.678/0001-90
[contracts] POST ok → id=clxxxxx num=RBN-2025-XXXXX
```

Ao fazer parse-pdf, os logs devem incluir:
```
[parse-pdf] File: proposta.pdf, mime=application/pdf, 245KB
[parse-pdf] OpenAI: ✓ 1842 chars
[parse-pdf] Quality: valid=true, total=52
[parse-pdf] DONE: partial=false, confidence=85
```

---

## 6. Regressões conhecidas para verificar

- [ ] Contrato gerado em PDF/impressão mantém quebras de página corretas
- [ ] Wizard não perde dados ao navegar entre passos (voltar e avançar)
- [ ] Matrix MDR importada por PDF persiste no preview e no contrato salvo
