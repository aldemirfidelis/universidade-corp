# Universidade Corporativa

SaaS LMS multiempresa: treinamentos, vídeos, provas, certificados, trilhas e relatórios.
Funcionário usa fácil no celular; administrador tem um LMS completo.

Stack (mesmo padrão do `gestao-360`): **pnpm monorepo** · **NestJS 10** · **Prisma 5 + PostgreSQL 16** · **Next.js 15 + Tailwind** · **Caddy** (SSL automático) · DigitalOcean Droplet.

## Estrutura

```
apps/api      API NestJS (Prisma, JWT, upload/stream de vídeo, multi-tenant)
apps/web      Next.js 15 (App Router, Tailwind, área do aluno + admin + super admin)
packages/shared  Enums e schemas Zod compartilhados (@uc/shared)
```

## Rodando localmente

Pré-requisitos: Node ≥20, pnpm 9 e **PostgreSQL 16** (via Docker ou instalado localmente).

```bash
pnpm install
pnpm shared:build

# 1) Suba o Postgres — escolha UMA opção:
pnpm db:up          # A) Docker (docker-compose.yml)
pnpm db:embedded    # B) Sem Docker: PostgreSQL embarcado em apps/api/.pgdata
#                        (deixe este comando rodando em um terminal à parte)

# 2) Migre e popule o banco
pnpm db:migrate     # (ou: pnpm --filter @uc/api exec prisma migrate deploy)
pnpm db:seed

# 3) Suba API (3333) e Web (3000)
pnpm dev
```

> **Sem Docker?** Use `pnpm db:embedded` — sobe um PostgreSQL 16 real, local, sem instalar
> nada (via `embedded-postgres`), apontado por `DATABASE_URL` em `apps/api/.env`. As migrações
> já estão geradas em `apps/api/prisma/migrations/`.

### Credenciais de demonstração (senha `123456`)

| Papel            | Login                  |
|------------------|------------------------|
| Super Admin      | super@demo.com         |
| Admin da Empresa | admin@goiasa.com       |
| Instrutor        | instrutor@goiasa.com   |
| Funcionário      | maria@goiasa.com       |

Empresa demo **Universidade Goiasa** com o treinamento **Segurança dos Alimentos**.

## Fluxo do funcionário

Login → **Meus Treinamentos** → abre o curso → assiste às aulas (progresso salvo,
check ao atingir o % mínimo) → ao concluir as aulas obrigatórias o treinamento é
concluído (ou libera a prova, se exigida) → certificado em **Meus Certificados**.

## Produção (Droplet)

**Ambiente atual:** Droplet DigitalOcean `universidade-corp` (NYC1, Ubuntu 22.04, 2GB/1CPU),
app publicado em **http://206.81.12.58** (origem única via Caddy na porta 80; `/api/*` → API, demais → Web).
Stack: `docker-compose.droplet.yml` (postgres + redis + api + web + caddy). Código em `/opt/universidade-corp`.

Primeiro deploy:
```bash
cp .env.droplet.example .env   # ajuste WEB_ORIGIN, segredos (gerados com: openssl rand -hex 32)
docker compose -f docker-compose.droplet.yml up -d --build
docker compose -f docker-compose.droplet.yml exec api pnpm prisma:seed   # bootstrap inicial
```

Atualizar o deploy (a partir da máquina de dev, via SSH):
```bash
git archive --format=tar HEAD | ssh root@206.81.12.58 "tar -x -C /opt/universidade-corp"
ssh root@206.81.12.58 "cd /opt/universidade-corp && docker compose -f docker-compose.droplet.yml up -d --build"
```

A API roda `prisma migrate deploy` automaticamente no start. Com domínio próprio, troque `:80`
por `seu-dominio` em `deploy/Caddyfile` para o Caddy emitir **SSL automático** (Let's Encrypt).
Pendências de produção: backup do Postgres (`pg_dump` agendado) e monitoramento de disco.

## Fases

1. ✅ Fundação multiempresa, auth, Super Admin, empresas, funcionários
2. ✅ Treinamentos, módulos/aulas, upload/stream de vídeo, progresso, turmas
3. ✅ Provas e avaliações (banco de questões, tentativas, nota, aprovação)
4. ✅ Certificados (PDF + QR + validação pública)
5. ✅ Relatórios e exportações (Excel)
6. ✅ IA (Gemini) para criação de conteúdo (com fallback offline)
7. ✅ Deploy no Droplet (Docker Compose + Caddy/SSL) — esqueleto pronto
```
