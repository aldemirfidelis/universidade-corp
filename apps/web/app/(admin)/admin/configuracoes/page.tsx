'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Settings, Upload, X, Plus, Image as ImageIcon, Palette, BookOpen, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { assetUrl, cn } from '@/lib/utils';

interface Settings {
  universityName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  heroTitle: string | null;
  aboutText: string | null;
  missionText: string | null;
  visionText: string | null;
  guidelines: string[];
  videoCompletionThreshold: number;
  defaultPassingScore: number;
  defaultCertificateValidityMonths: number;
}
interface CompanyMe {
  tradeName: string;
  settings: Settings | null;
}

const EMPTY = {
  universityName: '',
  logoUrl: null as string | null,
  coverUrl: null as string | null,
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  heroTitle: '',
  aboutText: '',
  missionText: '',
  visionText: '',
  guidelines: [] as string[],
  videoCompletionThreshold: 90,
  defaultPassingScore: 70,
  defaultCertificateValidityMonths: 12,
};

export default function ConfiguracoesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['company-me'], queryFn: () => api.get<CompanyMe>('/companies/me') });
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setForm({
        universityName: s.universityName ?? '',
        logoUrl: s.logoUrl,
        coverUrl: s.coverUrl,
        primaryColor: s.primaryColor ?? '#2563eb',
        secondaryColor: s.secondaryColor ?? '#0f172a',
        heroTitle: s.heroTitle ?? '',
        aboutText: s.aboutText ?? '',
        missionText: s.missionText ?? '',
        visionText: s.visionText ?? '',
        guidelines: s.guidelines ?? [],
        videoCompletionThreshold: s.videoCompletionThreshold ?? 90,
        defaultPassingScore: s.defaultPassingScore ?? 70,
        defaultCertificateValidityMonths: s.defaultCertificateValidityMonths ?? 12,
      });
    }
  }, [data]);

  // Preview de cores ao vivo enquanto edita.
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', form.primaryColor);
    document.documentElement.style.setProperty('--brand-dark', form.secondaryColor);
  }, [form.primaryColor, form.secondaryColor]);

  const mut = useMutation({
    mutationFn: () =>
      api.patch('/companies/settings', {
        ...form,
        guidelines: form.guidelines.map((g) => g.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Configurações salvas! As mudanças aparecem para os colaboradores no próximo acesso.');
      qc.invalidateQueries({ queryKey: ['company-me'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Configurações"
        subtitle="Personalize a identidade e as regras da sua academia corporativa."
        icon={<Settings size={20} />}
        actions={
          <Button onClick={() => mut.mutate()} loading={mut.isPending}>
            <Save size={16} /> Salvar alterações
          </Button>
        }
      />

      {/* Identidade visual */}
      <Section icon={<Palette size={18} />} title="Identidade visual" desc="Nome, logo, capa e cores da marca.">
        <div>
          <Label>Nome da Universidade</Label>
          <Input value={form.universityName} onChange={(e) => set('universityName', e.target.value)} placeholder="Academia da sua empresa" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField label="Logo" kind="logo" value={form.logoUrl} onChange={(url) => set('logoUrl', url)} aspect="h-16" />
          <ImageField label="Capa da Academia" kind="cover" value={form.coverUrl} onChange={(url) => set('coverUrl', url)} aspect="h-16" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Cor principal" value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
          <ColorField label="Cor secundária" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
        </div>
      </Section>

      {/* Conteúdo da Academia */}
      <Section icon={<BookOpen size={18} />} title="Conteúdo da Academia" desc="Textos exibidos na página inicial dos colaboradores.">
        <div>
          <Label>Frase de destaque (hero)</Label>
          <Input value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} placeholder="Desenvolva competências, fortaleça a cultura e gere resultados." />
        </div>
        <div>
          <Label>Texto de apresentação</Label>
          <Textarea
            value={form.aboutText}
            onChange={(e) => set('aboutText', e.target.value)}
            rows={3}
            placeholder="Bem-vindo à nossa academia corporativa..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Missão</Label>
            <Textarea value={form.missionText} onChange={(e) => set('missionText', e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Visão</Label>
            <Textarea value={form.visionText} onChange={(e) => set('visionText', e.target.value)} rows={3} />
          </div>
        </div>
        <GuidelinesEditor value={form.guidelines} onChange={(g) => set('guidelines', g)} />
      </Section>

      {/* Padrões de treinamento */}
      <Section icon={<SlidersHorizontal size={18} />} title="Padrões de treinamento" desc="Regras aplicadas por padrão a novos treinamentos.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>% mín. do vídeo</Label>
            <Input type="number" min={50} max={100} value={form.videoCompletionThreshold} onChange={(e) => set('videoCompletionThreshold', Number(e.target.value))} />
          </div>
          <div>
            <Label>Nota mínima</Label>
            <Input type="number" min={0} max={100} value={form.defaultPassingScore} onChange={(e) => set('defaultPassingScore', Number(e.target.value))} />
          </div>
          <div>
            <Label>Validade cert. (meses)</Label>
            <Input type="number" min={0} value={form.defaultCertificateValidityMonths} onChange={(e) => set('defaultCertificateValidityMonths', Number(e.target.value))} />
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} loading={mut.isPending} size="lg">
          <Save size={16} /> Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</span>
          <div>
            <h2 className="font-semibold leading-tight">{title}</h2>
            <p className="text-xs text-muted">{desc}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 rounded-lg border border-line" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function ImageField({
  label,
  kind,
  value,
  onChange,
  aspect,
}: {
  label: string;
  kind: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const preview = assetUrl(value);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.upload<{ url: string }>(`/media/image?kind=${kind}`, form);
      onChange(res.url);
      toast.success(`${label} enviada.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className={cn('flex w-24 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-muted', aspect)}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon size={20} className="text-slate-300" />
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} loading={busy}>
          <Upload size={14} /> Enviar
        </Button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-muted transition hover:text-danger" title="Remover">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function GuidelinesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <Label>Diretrizes (lista numerada)</Label>
      <div className="space-y-2">
        {value.map((g, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
              {i + 1}
            </span>
            <Input
              value={g}
              onChange={(e) => onChange(value.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder="Descreva a diretriz..."
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="text-muted transition hover:text-danger"
              title="Remover"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...value, ''])}>
          <Plus size={14} /> Adicionar diretriz
        </Button>
      </div>
    </div>
  );
}
