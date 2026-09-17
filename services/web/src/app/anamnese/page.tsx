'use client';

import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { Button, Notice, PageIntro, Panel } from '@/components/ui';
import { Check, ChevronRight, CircleAlert, ClipboardPlus, HeartPulse } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const restrictionOptions = [
  'Impacto subacromial / dor no ombro',
  'Dor lombar',
  'Desconforto no joelho',
  'Limitação de quadril',
  'Hipertensão controlada',
];

const equipmentOptions = [
  'Academia completa com máquinas, cabos, barras e halteres',
  'Halteres, banco e faixas elásticas em casa',
  'Peso corporal e faixa elástica',
  'Equipamentos de condomínio',
];

export default function AnamnesePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getSessionUser>>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    userId: '',
    goal: 'Hipertrofia com melhora do condicionamento geral',
    experience: 'INTERMEDIATE' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    gender: 'FEMALE' as 'MALE' | 'FEMALE',
    weeklyDays: 4,
    injuries: [] as string[],
    customInjury: '',
    availableEquip: equipmentOptions[0],
  });

  useEffect(() => {
    const authenticatedUser = getSessionUser();

    if (!authenticatedUser) {
      router.replace('/cadastro');
      return;
    }

    if (authenticatedUser.role !== 'STUDENT') {
      router.replace('/admin');
      return;
    }

    setCurrentUser(authenticatedUser);
    setForm((current) => ({ ...current, userId: authenticatedUser.id }));
  }, [router]);

  function toggleRestriction(item: string) {
    setForm((current) => ({
      ...current,
      injuries: current.injuries.includes(item)
        ? current.injuries.filter((value) => value !== item)
        : [...current.injuries, item],
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    const custom = form.customInjury.trim();
    const injuries = custom ? [...form.injuries, custom] : form.injuries;

    try {
      await apiFetch('/anamnesis', {
        method: 'POST',
        body: JSON.stringify({
          userId: form.userId,
          goal: form.goal,
          experience: form.experience,
          weeklyDays: form.weeklyDays,
          injuries,
          gender: form.gender,
          availableEquip: form.availableEquip,
        }),
      });
      setMessage({ kind: 'success', text: 'Avaliação enviada com sucesso! Redirecionando para o seu painel...' });
      window.setTimeout(() => router.push('/aluno'), 700);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <PageIntro
        eyebrow="Avaliação inicial"
        title="Conte o que seu treino precisa respeitar."
        description="Essas informações orientam a periodização e, principalmente, os limites biomecânicos. O personal revisa tudo antes da aprovação."
      />

      <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <Panel className="p-6 md:p-9">
          <form onSubmit={handleSubmit} className="space-y-9">
            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300"><ClipboardPlus size={19} /></span>
                <div><p className="text-xs font-black uppercase tracking-wider text-emerald-400">Etapa 01</p><h2 className="font-display text-xl font-semibold text-zinc-100">Perfil e objetivo</h2></div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <span className="field-label">Aluno identificado</span>
                  <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-4 py-3">
                    <strong className="block text-sm font-semibold text-zinc-100">{currentUser?.name ?? 'Carregando seu perfil...'}</strong>
                    {currentUser ? <span className="mt-1 block text-xs text-zinc-400">{currentUser.email}</span> : null}
                  </div>
                </div>
                <label>
                  <span className="field-label">Nível de experiência</span>
                  <select className="field-control" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value as typeof form.experience })}>
                    <option value="BEGINNER">Iniciante</option>
                    <option value="INTERMEDIATE">Intermediário</option>
                    <option value="ADVANCED">Avançado</option>
                  </select>
                </label>
                <fieldset className="md:col-span-2">
                  <legend className="field-label">Sexo biológico para personalização biomecânica</legend>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {([{ value: 'FEMALE', label: 'Feminino' }, { value: 'MALE', label: 'Masculino' }] as const).map((option) => (
                      <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 font-bold transition ${form.gender === option.value ? 'border-emerald-300 bg-emerald-400 text-[#06110e]' : 'border-slate-700 bg-[#131B2E] text-slate-200 hover:border-emerald-400/50'}`}>
                        <input className="sr-only" type="radio" name="gender" value={option.value} checked={form.gender === option.value} onChange={() => setForm({ ...form, gender: option.value })} />
                        <strong className={`block font-bold ${form.gender === option.value ? 'text-zinc-950' : 'text-zinc-100'}`}>{option.label}</strong>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="md:col-span-2">
                  <span className="field-label">Objetivo principal</span>
                  <textarea className="field-control min-h-28 resize-y" value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} minLength={5} required placeholder="Ex.: ganhar massa muscular, melhorar postura e condicionamento..." />
                </label>
                <label className="md:col-span-2">
                  <span className="field-label">Dias disponíveis por semana: <strong className="text-emerald-400">{form.weeklyDays}</strong></span>
                  <input type="range" min="1" max="7" value={form.weeklyDays} onChange={(event) => setForm({ ...form, weeklyDays: Number(event.target.value) })} className="w-full accent-emerald-500" />
                  <div className="mt-1 flex justify-between text-xs font-bold text-zinc-400"><span>1 dia</span><span>7 dias</span></div>
                </label>
              </div>
            </section>

            <div className="h-px bg-ink/10" />

            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/15 text-orange-300"><HeartPulse size={19} /></span>
                <div><p className="text-xs font-black uppercase tracking-wider text-orange-300">Etapa 02</p><h2 className="font-display text-xl font-semibold text-zinc-100">Restrições e cuidados</h2></div>
              </div>
              <p className="mb-4 text-sm leading-6 text-zinc-400">Selecione tudo que se aplica. A ausência de seleção será registrada como “sem restrições relatadas”.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {restrictionOptions.map((item) => {
                  const active = form.injuries.includes(item);
                  return (
                    <button key={item} type="button" onClick={() => toggleRestriction(item)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${active ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300' : 'border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-emerald-500/60 hover:bg-zinc-800/80'}`}>
                      {item}<span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-700'}`}>{active ? <Check size={13} /> : null}</span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-4 block">
                <span className="field-label">Outra restrição, cirurgia ou observação clínica</span>
                <textarea className="field-control min-h-24 resize-y" value={form.customInjury} onChange={(event) => setForm({ ...form, customInjury: event.target.value })} placeholder="Descreva lado afetado, movimentos que causam desconforto e orientação profissional existente." />
              </label>
            </section>

            <div className="h-px bg-ink/10" />

            <section>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-400">Etapa 03</p>
              <h2 className="font-display text-xl font-semibold text-zinc-100">Equipamentos disponíveis</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {equipmentOptions.map((item) => (
                  <label key={item} className={`cursor-pointer rounded-2xl border p-4 text-sm font-bold leading-6 transition ${form.availableEquip === item ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-emerald-500/50'}`}>
                    <input type="radio" name="equipment" className="sr-only" value={item} checked={form.availableEquip === item} onChange={() => setForm({ ...form, availableEquip: item })} />
                    {item}
                  </label>
                ))}
              </div>
              <label className="mt-4 block">
                <span className="field-label">Ou descreva seu espaço</span>
                <input className="field-control" value={form.availableEquip} onChange={(event) => setForm({ ...form, availableEquip: event.target.value })} required minLength={2} />
              </label>
            </section>

            {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center">
              <Button type="submit" loading={submitting} disabled={!form.userId} className="sm:min-w-52">
                Enviar ao personal <ChevronRight size={18} />
              </Button>
            </div>
          </form>
        </Panel>

        <aside className="space-y-5">
          <Panel className="overflow-hidden !bg-[#131B2E] p-6 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">Método Felipe Ferreira</p>
            <h3 className="mt-3 font-display text-2xl font-bold">Metodologia Sob Medida</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Acompanhamento próximo e estratégia de treino desenhada para a sua evolução.</p>
            <div className="mt-6 space-y-3">
              {['Acompanhamento e supervisão direta: Felipe Ferreira (CREF 071550-RJ)', 'Periodização baseada em sobrecarga progressiva e biomecânica aplicada', 'Planilhas personalizadas entregues diretamente no seu painel', 'Suporte para dúvidas e ajustes de carga'].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold"><Check size={16} className="text-emerald-300" /> {item}</div>)}
            </div>
          </Panel>
          <div className="rounded-2xl border border-orange-200 border-orange-500/30 bg-orange-950/30 p-5 text-orange-200">
            <div className="flex gap-3"><CircleAlert className="mt-0.5 shrink-0" size={19} /><p className="text-sm leading-6"><strong>Dor não é parâmetro de progresso.</strong> Em caso de sintomas agudos, procure avaliação qualificada antes de iniciar o treino.</p></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
