'use client';

import Link from 'next/link';
import { GraduationCap, Target, Eye, ShieldCheck, ArrowRight, BookOpen, Award, PlayCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { assetUrl } from '@/lib/utils';

const DEFAULT_HERO = 'Desenvolva competências, fortaleça a cultura e gere resultados.';
const DEFAULT_ABOUT =
  'Este é o espaço dedicado ao seu desenvolvimento profissional. Aqui você acessa os treinamentos, conteúdos e programas que fortalecem competências, promovem a segurança e garantem a qualidade dos nossos processos.';

export default function AcademiaPage() {
  const { me } = useAuth();
  const b = me?.branding;
  const nome = b?.universityName ?? 'Academia Corporativa';
  const hero = b?.heroTitle ?? DEFAULT_HERO;
  const about = b?.aboutText ?? DEFAULT_ABOUT;
  const cover = assetUrl(b?.coverUrl);
  const logo = assetUrl(b?.logoUrl);
  const guidelines = b?.guidelines ?? [];

  return (
    <div className="space-y-8">
      {/* Herói */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-8 text-white sm:p-12">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={nome} className="h-12 w-auto" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <GraduationCap size={28} />
            </span>
          )}
          <span className="text-lg font-semibold opacity-90">{nome}</span>
        </div>
        <h1 className="relative mt-6 max-w-3xl text-2xl font-bold leading-snug sm:text-4xl">{hero}</h1>
        <Link href="/meus-treinamentos">
          <Button size="lg" className="mt-8 bg-white text-brand hover:bg-white/90">
            <PlayCircle size={20} /> Começar meus treinamentos <ArrowRight size={18} />
          </Button>
        </Link>
      </div>

      {/* Apresentação */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <h2 className="text-xl font-bold">Bem-vindo à {nome}!</h2>
          <p className="mt-3 leading-relaxed text-muted">{about}</p>
        </CardContent>
      </Card>

      {/* Atalhos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/meus-treinamentos">
          <Card interactive className="h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <BookOpen size={24} />
              </span>
              <div>
                <p className="font-semibold">Meus Treinamentos</p>
                <p className="text-sm text-muted">Acesse e continue seus cursos.</p>
              </div>
              <ArrowRight size={18} className="ml-auto text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/meus-certificados">
          <Card interactive className="h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Award size={24} />
              </span>
              <div>
                <p className="font-semibold">Meus Certificados</p>
                <p className="text-sm text-muted">Baixe e valide seus certificados.</p>
              </div>
              <ArrowRight size={18} className="ml-auto text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Missão e Visão — exibidas quando configuradas para a empresa */}
      {(b?.mission || b?.vision) && (
        <div className="grid gap-4 md:grid-cols-2">
          {b?.mission && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-brand">
                  <Target size={20} />
                  <h3 className="font-semibold">Missão</h3>
                </div>
                <p className="mt-2 text-muted">{b.mission}</p>
              </CardContent>
            </Card>
          )}
          {b?.vision && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-brand">
                  <Eye size={20} />
                  <h3 className="font-semibold">Visão</h3>
                </div>
                <p className="mt-2 text-muted">{b.vision}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Diretrizes — exibidas quando configuradas para a empresa */}
      {guidelines.length > 0 && (
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brand">
              <ShieldCheck size={20} />
              <h3 className="font-semibold">Diretrizes</h3>
            </div>
            <ol className="mt-4 space-y-2">
              {guidelines.map((d, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  {d}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
