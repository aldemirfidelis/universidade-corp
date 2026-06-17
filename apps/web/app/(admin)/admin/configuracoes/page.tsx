'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

interface CompanyMe {
  tradeName: string;
  settings: {
    universityName: string;
    primaryColor: string;
    secondaryColor: string;
    videoCompletionThreshold: number;
    defaultPassingScore: number;
    defaultCertificateValidityMonths: number;
  } | null;
}

export default function ConfiguracoesPage() {
  const { data } = useQuery({ queryKey: ['company-me'], queryFn: () => api.get<CompanyMe>('/companies/me') });
  const [form, setForm] = useState({
    universityName: '',
    primaryColor: '#2563eb',
    secondaryColor: '#0f172a',
    videoCompletionThreshold: 90,
    defaultPassingScore: 70,
    defaultCertificateValidityMonths: 12,
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        universityName: data.settings.universityName,
        primaryColor: data.settings.primaryColor,
        secondaryColor: data.settings.secondaryColor,
        videoCompletionThreshold: data.settings.videoCompletionThreshold,
        defaultPassingScore: data.settings.defaultPassingScore,
        defaultCertificateValidityMonths: data.settings.defaultCertificateValidityMonths,
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => api.patch('/companies/settings', form),
    onSuccess: () => {
      document.documentElement.style.setProperty('--brand', form.primaryColor);
      document.documentElement.style.setProperty('--brand-dark', form.secondaryColor);
      toast.success('Configurações salvas!');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="space-y-5"
          >
            <div>
              <Label>Nome da Universidade</Label>
              <Input
                value={form.universityName}
                onChange={(e) => setForm({ ...form, universityName: e.target.value })}
                placeholder="Universidade Goiasa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor principal</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="h-11 w-14 rounded-lg border border-slate-300"
                  />
                  <Input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Cor secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="h-11 w-14 rounded-lg border border-slate-300"
                  />
                  <Input value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>% mín. do vídeo</Label>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={form.videoCompletionThreshold}
                  onChange={(e) => setForm({ ...form, videoCompletionThreshold: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Nota mínima</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.defaultPassingScore}
                  onChange={(e) => setForm({ ...form, defaultPassingScore: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Validade cert. (meses)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.defaultCertificateValidityMonths}
                  onChange={(e) => setForm({ ...form, defaultCertificateValidityMonths: Number(e.target.value) })}
                />
              </div>
            </div>

            <Button type="submit" disabled={mut.isPending}>
              <Save size={16} /> {mut.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
