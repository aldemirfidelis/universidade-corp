# Academia Goiasa — Atendimento ao Escopo

Documento de rastreabilidade entre o **escopo da Goiasa** e a **implementação** na plataforma
Universidade Corporativa. Status: ✅ implementado · 🟡 parcial/fallback · 🔵 desejável (sem integração disponível).

> Empresa demo já configurada como **Academia Goiasa**. Credenciais (senha `123456`):
> `admin@goiasa.com` (T&D), `gestor@goiasa.com` (Gestor), `maria@goiasa.com` (Colaborador),
> `instrutor@goiasa.com`, `super@demo.com`.

---

## 2. Objetivos
| Objetivo | Status | Onde |
|---|---|---|
| Centralizar treinamentos internos | ✅ | Módulo `courses` + área Admin → Treinamentos |
| Disponibilizar conteúdos digitais (vídeo/PDF) | ✅ | `media` (upload/stream), materiais por aula |
| Controlar validade dos treinamentos | ✅ | `validity` (status VALID/EXPIRING/EXPIRED, retreinamento) |
| Registrar evidências de participação | ✅ | `lesson_progress` (tempo, %, IP, dispositivo, datas) + auditoria |
| Avaliar conhecimento | ✅ | `assessments`/`exam` (banco de questões, nota 70%) |
| Indicadores e relatórios gerenciais | ✅ | `dashboard` (RH/Gestor) + `reports` (Excel/PDF) |
| Integração com sistemas corporativos | 🟡 | APDATA: import via Excel (ver §7) |

## 3. Perfis de acesso
| Perfil escopo | Papel na plataforma | Status |
|---|---|---|
| Administrador (T&D) | `COMPANY_ADMIN` (cria/edita/exclui treinamentos, avaliações, vídeos, documentos, validade, público-alvo, relatórios, usuários) | ✅ |
| Colaborador | `EMPLOYEE` (realiza treinamentos, histórico, documentos, avaliações, status) | ✅ |
| (extra) Instrutor / Gestor | `INSTRUCTOR` / `MANAGER` | ✅ |

RBAC por perfil em `common/guards/roles.guard.ts` + `@Roles()`. Multi-tenant via `effectiveCompanyId()`.

## 4. Tela inicial ✅
Página **Academia Goiasa** em `apps/web/app/(aluno)/academia/page.tsx`:
- Logomarca (branding da empresa) e frase institucional *"Conhecimento que transforma…"*;
- Texto de apresentação da Academia;
- **Missão, Visão e as 10 Diretrizes** (conteúdo do escopo);
- Botão **"Começar meus treinamentos"**.
É a tela pós-login do colaborador (`homeForRole`).

## 5. Login e cadastro ✅ / 🟡
- Autenticação por **Matrícula, CPF ou e-mail + Senha** (campo único `identifier`) — `auth.service.ts`.
- Informações mínimas no cadastro: **Nome, Matrícula, Cargo, Área, Setor, Unidade** — campos
  `name`, `registration`, `position` (Cargo), `area`, `department` (Setor), `unit` (Unidade) no `User`.
- 🟡 **APDATA**: integração direta não disponível neste ambiente → **importação via planilha Excel/CSV**
  (`POST /users/import`, colunas `nome,email,cpf,matricula,cargo,setor,área,unidade`).

## 6. Matriz de Treinamentos por cargo ✅
- Modelo `TrainingMatrix` (cargo → cursos obrigatórios).
- Admin: **Matriz por Cargo** (`/admin/matriz`) — seleciona o cargo e marca os treinamentos.
- **Auto-atribuição**: ao associar o colaborador a um cargo (criação/edição/import), os treinamentos
  da matriz são matriculados automaticamente — `MatrixService.enrollUserMatrix`.
- Demo: cargo *Operador de Produção* → *Segurança dos Alimentos* (matricula a Maria automaticamente).

## 7. Integração com APDATA 🟡
Integração automática não disponível. **Fallback implementado**: importação via Excel/CSV de
colaboradores, cargos, área/setor/unidade. Estrutura preparada para futura integração (campos e
import em massa já existem). *Movimentação/histórico via API APDATA: ponto de evolução futuro.*

## 8. Módulos de treinamento ✅
Curso com: Nome, **Código** (`code`), Descrição, **Área responsável** (`department`), **Carga horária**,
**Data de revisão** (`revisionDate`), **Validade** (`validityMonths`), **Público-alvo** (matriz/turma),
Vídeo, PDF e **Avaliação**. Telas: `/admin/treinamentos/novo` e `/admin/treinamentos/[id]`.

## 9. Vídeos de treinamento ✅
- Upload (`POST /media/lessons/:id/video`) e **streaming com Range** (mobile-friendly).
- Registra **início/término, tempo assistido e percentual** (`lesson_progress`).
- **Não conclui sem assistir** ao mínimo (`videoCompletionThreshold`, padrão 90%).
- **Bloqueio de avanço** (anti-seek): o player impede pular o vídeo para frente.
- Tempo mínimo configurável por empresa (Configurações → % mínimo do vídeo).

## 10. Documentos de referência ✅
Anexos por aula (Procedimentos, IT, Manuais, Formulários, Políticas) em **PDF e Word (DOCX)** —
`lesson_materials`, `POST /media/lessons/:id/material`.

## 11. Avaliação de conhecimento ✅ / 🔵
- Tipos: **múltipla escolha, verdadeiro/falso, associação, baseadas em imagem** (campo `imageUrl`).
- **Banco de questões, sorteio aleatório, correção automática, registro de tentativas**, **nota mínima 70%**.
- 🔵 *Perguntas durante a reprodução do vídeo*: desejável — ponto de evolução futuro.

## 12. Certificação e conclusão ✅
Registra **nome, data, hora, nota e situação (Aprovado/Reprovado)**; tempo total via `lesson_progress`.
**Certificado em PDF gerado automaticamente** com **QR Code** e código único.

## 13. Assinatura eletrônica (Exataid) 🔵
Integração não disponível. **Fallback**: exportação de listas de participação (Excel/PDF) para coleta
externa de assinatura. Estrutura de evidências (auditoria + progresso) já registra ciência/aceite.

## 14. Dashboard do colaborador ✅
`/inicio` (`GET /learning/dashboard`): **pendentes, vencidos, concluídos, próximos vencimentos,
histórico**, com ação **Refazer** (retreinamento) para vencidos.

## 15. Dashboard do gestor ✅
`/gestor/dashboard` (`GET /dashboard/team`): **equipe treinada/pendente, vencidos, % de aderência,
ranking da equipe**. Escopo restrito aos subordinados (`managerId`). Alertas via notificações.

## 16. Dashboard do RH/T&D ✅
`/admin/dashboard` (`GET /dashboard/overview`): aderência, conclusão, **média de notas, índice de
aprovação**, certificados, **validade (válidos/expirando/vencidos)**; **gráficos de barras (mês) e
pizza (por área)**. Indicadores por área/unidade/cargo via Relatórios.

## 17. Relatórios ✅
`/admin/relatorios` — **exportação Excel e PDF**; filtros: **treinamento, cargo, setor, área, unidade,
período, status**. Colunas: nome, matrícula, cargo, setor, área, unidade, treinamento, código, status,
progresso, conclusão e **vencimento**.

## 18. Notificações automáticas ✅ / 🟡
In-app para: **novo treinamento atribuído** (matriz/turma), **prova reprovada**, **certificado emitido**,
**próximo do vencimento** e **vencido**. 🟡 Envio por **e-mail** (SMTP configurável) e agendamento
periódico (cron) são evolução de produção; geração in-app já ativa.

## 19. Segurança da informação ✅ / 🟡
- **Controle de acesso por perfil** (RBAC) e isolamento multiempresa.
- **Logs/rastreabilidade**: `AuditInterceptor` registra toda mutação (autor, ação, entidade, IP,
  user-agent, **data/hora**) em `audit_logs`; consulta em `GET /platform-admin/audit`.
- **LGPD**: dados segregados por empresa, soft-delete, sem exposição entre empresas.
- 🟡 **Backup automático**: rotina `pg_dump` documentada para produção (Droplet) — ver README §Produção.

---

## Itens desejáveis (evolução futura)
- Integração APDATA (importação/movimentação automática) — hoje via Excel.
- Integração Exataid (assinatura eletrônica) — hoje via exportação de lista.
- Perguntas durante o vídeo.
- Envio de notificações por e-mail + agendamento (cron) e push.

## Onde está cada coisa (mapa rápido)
- API: `apps/api/src/modules/{matrix,validity,courses,media,learning,assessments,certificates,reports,dashboard,users,auth,audit}`
- Web: `apps/web/app/(aluno)` (colaborador), `apps/web/app/(admin)` (T&D), `apps/web/app/gestor` (gestor)
- Schema: `apps/api/prisma/schema.prisma` (modelos `TrainingMatrix`, campos `User.area/unit`, `Course.code/revisionDate`)
