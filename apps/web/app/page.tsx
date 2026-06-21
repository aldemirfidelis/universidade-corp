import Link from 'next/link';
import {
  GraduationCap,
  PlayCircle,
  FileQuestion,
  Award,
  Grid3x3,
  BarChart3,
  Building2,
  ShieldCheck,
  Trophy,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';

const FEATURES = [
  { icon: PlayCircle, title: 'Treinamentos em vídeo', desc: 'Upload e streaming com controle de progresso e regra anti-pulo de conteúdo.' },
  { icon: FileQuestion, title: 'Provas e avaliações', desc: 'Banco de questões, tentativas, nota mínima e aprovação automática.' },
  { icon: Award, title: 'Certificados válidos', desc: 'Emissão automática em PDF com QR e validação pública.' },
  { icon: Grid3x3, title: 'Matriz por cargo', desc: 'Defina treinamentos obrigatórios por função e matricule em massa.' },
  { icon: BarChart3, title: 'Relatórios e analytics', desc: 'Adesão, conclusão, validade e exportação para Excel/PDF.' },
  { icon: Building2, title: 'Multiempresa & white-label', desc: 'Sua marca, suas cores, seu domínio — isolado por empresa.' },
];

const STEPS = [
  { n: 1, title: 'Configure sua academia', desc: 'Marca, cores, missão e diretrizes em minutos.' },
  { n: 2, title: 'Importe colaboradores', desc: 'Por planilha, integração ou cadastro — com cargos e setores.' },
  { n: 3, title: 'Treine e acompanhe', desc: 'Atribua treinamentos, acompanhe indicadores e emita certificados.' },
];

const PLANS = [
  {
    name: 'Essencial',
    price: 'Sob consulta',
    desc: 'Para times que estão começando a estruturar o T&D.',
    features: ['Até 100 colaboradores', 'Treinamentos e provas', 'Certificados em PDF', 'Relatórios essenciais'],
    highlight: false,
  },
  {
    name: 'Profissional',
    price: 'Sob consulta',
    desc: 'Para empresas com compliance e matriz por cargo.',
    features: ['Colaboradores ilimitados', 'Matriz por cargo + validade', 'Gamificação e trilhas', 'Analytics avançado', 'Suporte prioritário'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob medida',
    desc: 'Para operações multiunidade e integrações.',
    features: ['Multiempresa & SSO', 'Domínio próprio (white-label)', 'Integrações (RH/APDATA)', 'SCORM/xAPI', 'Gerente de conta dedicado'],
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <GraduationCap size={20} />
            </span>
            <span className="font-semibold">Universidade Corporativa</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Entrar
            </Link>
            <a
              href="#planos"
              className="hidden rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-110 sm:inline-flex"
            >
              Solicitar demonstração
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_40rem_at_80%_-10%,rgb(37_99_235/0.12),transparent_60%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-brand shadow-sm">
              <Sparkles size={14} /> Plataforma LMS para treinamento corporativo
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Treine suas equipes com a sua marca, do jeito certo.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Normas internas, procedimentos e manuais em uma academia corporativa completa: vídeos, provas,
              certificados, matriz por cargo e indicadores — multiempresa e white-label.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#planos"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground shadow-sm transition hover:brightness-110"
              >
                Solicitar demonstração <ArrowRight size={18} />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-6 py-3.5 text-base font-semibold shadow-sm transition hover:bg-surface-muted"
              >
                <PlayCircle size={18} /> Entrar na plataforma
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-success" /> Compliance e validade</span>
              <span className="inline-flex items-center gap-1.5"><Trophy size={16} className="text-warning" /> Gamificação</span>
              <span className="inline-flex items-center gap-1.5"><Building2 size={16} className="text-brand" /> Multiempresa</span>
            </div>
          </div>

          {/* Mock visual */}
          <div className="relative">
            <div className="rounded-3xl border border-line bg-surface p-3 shadow-card-hover">
              <div className="rounded-2xl bg-brand-gradient p-6 text-white">
                <p className="text-sm opacity-80">Olá, Maria 👋</p>
                <p className="mt-1 text-lg font-bold">Continue de onde parou</p>
                <div className="mt-4 rounded-xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-sm font-medium">Segurança dos Alimentos</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
                    <div className="h-full w-2/3 rounded-full bg-white" />
                  </div>
                  <p className="mt-1.5 text-xs opacity-80">65% concluído</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-3">
                {[
                  { label: 'Pendentes', value: '3' },
                  { label: 'Concluídos', value: '12' },
                  { label: 'Adesão', value: '94%' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-line bg-surface p-3 text-center">
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-[0.65rem] text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Tudo que o seu T&D precisa</h2>
          <p className="mt-3 text-muted">Da criação do conteúdo ao certificado, com governança e indicadores.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Pronto para usar em 3 passos</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-brand-foreground">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Planos para cada estágio</h2>
          <p className="mt-3 text-muted">Comece pequeno e escale conforme sua operação cresce.</p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                p.highlight
                  ? 'relative rounded-3xl border-2 border-brand bg-surface p-7 shadow-card-hover'
                  : 'rounded-3xl border border-line bg-surface p-7 shadow-card'
              }
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.desc}</p>
              <p className="mt-4 text-2xl font-bold">{p.price}</p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="#contato"
                className={
                  p.highlight
                    ? 'mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition hover:brightness-110'
                    : 'mt-6 flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 py-3 text-sm font-semibold transition hover:bg-surface-muted'
                }
              >
                Falar com vendas
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section id="contato" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient px-8 py-12 text-center text-white sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight">Vamos treinar suas equipes?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Agende uma demonstração e veja a plataforma com a identidade da sua empresa.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:contato@universidadecorp.com.br?subject=Quero uma demonstração"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-brand transition hover:bg-white/90"
            >
              Solicitar demonstração <ArrowRight size={18} />
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Já sou cliente
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <GraduationCap size={15} />
            </span>
            Universidade Corporativa
          </div>
          <p>© {new Date().getFullYear()} — Plataforma de treinamento corporativo.</p>
        </div>
      </footer>
    </div>
  );
}
