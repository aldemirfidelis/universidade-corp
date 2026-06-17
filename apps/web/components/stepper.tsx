export function Stepper({ step }: { step: number }) {
  const steps = ['Informações', 'Conteúdo e vídeos', 'Público e turma', 'Publicar'];
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {steps.map((s, i) => (
        <li
          key={s}
          className={`rounded-full px-3 py-1 ${
            i + 1 === step ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}
