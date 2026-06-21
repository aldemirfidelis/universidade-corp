'use client';

import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const faqs = [
  {
    q: 'Como assisto a um treinamento?',
    a: 'Toque em "Meus Treinamentos", escolha o curso e assista às aulas em sequência. Seu progresso é salvo automaticamente.',
  },
  {
    q: 'Quando recebo o certificado?',
    a: 'Ao concluir todas as aulas obrigatórias (e a prova, quando houver), o certificado é liberado em "Meus Certificados".',
  },
  {
    q: 'Posso continuar de onde parei?',
    a: 'Sim! A tela inicial mostra o botão "Continuar treinamento" para retomar de onde você parou.',
  },
  {
    q: 'Esqueci minha senha.',
    a: 'Na tela de login, use "Esqueci minha senha" para receber as instruções, ou fale com o RH da sua empresa.',
  },
];

export default function AjudaPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Ajuda" subtitle="Dúvidas frequentes sobre a plataforma." icon={<HelpCircle size={20} />} />
      <div className="grid gap-3">
        {faqs.map((f) => (
          <Card key={f.q}>
            <CardContent className="p-5">
              <p className="font-medium">{f.q}</p>
              <p className="mt-1 text-sm text-muted">{f.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
