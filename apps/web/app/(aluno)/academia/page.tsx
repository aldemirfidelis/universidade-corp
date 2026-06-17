'use client';

import Link from 'next/link';
import { GraduationCap, Target, Eye, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DIRETRIZES = [
  'Mitigar riscos relacionados à Saúde e Segurança do Trabalho;',
  'Proteger o meio ambiente através de ações que previnam a poluição, preservem a fauna, a flora e os recursos naturais;',
  'Controlar os perigos relacionados à Qualidade e Segurança de Alimentos, atendendo aos requisitos legais, de Clientes e do Sistema de Gestão;',
  'Assegurar a fidelidade e satisfação dos Clientes;',
  'Garantir a eficácia dos processos internos assegurando a consulta e participação dos Colaboradores;',
  'Incentivar a evolução contínua da competência dos Colaboradores;',
  'Garantir que as vagas sejam preenchidas, preferencialmente, através de seleção interna;',
  'Promover a diversidade, proporcionar a equidade e assegurar a inclusão;',
  'Promover a avaliação, comunicação e atendimento dos requisitos do Sistema Integrado de Gestão;',
  'Assegurar a comunicação com a comunidade.',
];

export default function AcademiaPage() {
  const { me } = useAuth();
  const nome = me?.branding?.universityName ?? 'Academia Goiasa';

  return (
    <div className="space-y-8">
      {/* Herói */}
      <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 text-white sm:p-12">
        <div className="flex items-center gap-3">
          {me?.branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.branding.logoUrl} alt="Goiasa" className="h-12 w-auto" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <GraduationCap size={28} />
            </span>
          )}
          <span className="text-lg font-semibold opacity-90">{nome}</span>
        </div>
        <h1 className="mt-6 max-w-3xl text-2xl font-bold leading-snug sm:text-4xl">
          Conhecimento que transforma, segurança que protege e qualidade que gera resultados.
        </h1>
        <Link href="/meus-treinamentos">
          <Button size="lg" className="btn-grande mt-8 bg-white text-brand hover:bg-white/90">
            Começar meus treinamentos <ArrowRight size={20} />
          </Button>
        </Link>
      </div>

      {/* Apresentação */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <h2 className="text-xl font-bold">Bem-vindo à {nome}!</h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Este é o espaço dedicado ao seu desenvolvimento profissional. Aqui você terá acesso aos
            treinamentos, conteúdos e programas que fortalecem nossas competências, promovem a
            segurança, garantem a qualidade dos processos e contribuem para a construção de
            resultados cada vez melhores.
          </p>
          <p className="mt-3 font-medium text-brand">
            Conhecimento que transforma, segurança que protege e qualidade que gera resultados.
          </p>
        </CardContent>
      </Card>

      {/* Missão e Visão */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-brand">
              <Target size={20} />
              <h3 className="font-semibold">Missão</h3>
            </div>
            <p className="mt-2 text-slate-600">
              Produzir e fornecer energia renovável ao menor custo, com excelência no serviço e em
              harmonia com a comunidade e o meio ambiente.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-brand">
              <Eye size={20} />
              <h3 className="font-semibold">Visão</h3>
            </div>
            <p className="mt-2 text-slate-600">
              Ser referência no setor como empresa de elevado retorno ao acionista aliado à
              responsabilidade social.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Diretrizes */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-brand">
            <ShieldCheck size={20} />
            <h3 className="font-semibold">Diretrizes</h3>
          </div>
          <ol className="mt-4 space-y-2">
            {DIRETRIZES.map((d, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                {d}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
