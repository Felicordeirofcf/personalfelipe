'use client';

import { apiFetch } from '@/lib/api';
import { Button, Notice, Panel } from '@/components/ui';
import { User } from '@/types';
import { Check, ChevronRight, CircleAlert, ClipboardPlus, HeartPulse, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const restrictionOptions = ['Impacto subacromial / dor no ombro', 'Dor lombar', 'Desconforto no joelho', 'Limitação de quadril', 'Hipertensão controlada'];
const equipmentOptions = ['Academia completa com máquinas, cabos, barras e halteres', 'Halteres, banco e faixas elásticas em casa', 'Peso corporal e faixa elástica', 'Equipamentos de condomínio'];
const genderOptions = [{ value: 'FEMALE', label: 'Feminino' }, { value: 'MALE', label: 'Masculino' }] as const;

export default function AnamnesePage() {
  const router = useRouter();
  const [students, setStudents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ userId: '', goal: 'Hipertrofia com melhora do condicionamento geral', experience: 'INTERMEDIATE' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED', gender: 'FEMALE' as 'MALE' | 'FEMALE', weeklyDays: 4, injuries: [] as string[], customInjury: '', availableEquip: equipmentOptions[0] });

  useEffect(() => {
    apiFetch<{ users: User[] }>('/users?role=STUDENT').then(({ users }) => { setStudents(users); if (users[0]) setForm((current) => ({ ...current, userId: users[0].id })); }).catch((error: Error) => setMessage({ kind: 'error', text: error.message })).finally(() => setLoadingStudents(false));
  }, []);

  function toggleRestriction(item: string) { setForm((current) => ({ ...current, injuries: current.injuries.includes(item) ? current.injuries.filter((value) => value !== item) : [...current.injuries, item] })); }
  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    const custom = form.customInjury.trim();
    try {
      await apiFetch('/anamnesis', { method: 'POST', body: JSON.stringify({ userId: form.userId, goal: form.goal, experience: form.experience, weeklyDays: form.weeklyDays, injuries: custom ? [...form.injuries, custom] : form.injuries, gender: form.gender, availableEquip: form.availableEquip }) });
      setMessage({ kind: 'success', text: 'Anamnese enviada. O personal já pode gerar o rascunho do treino.' });
      window.setTimeout(() => router.push('/admin'), 900);
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar.' }); } finally { setSubmitting(false); }
  }

  const input = 'field-control';
  return <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
    <header className="mb-9 max-w-3xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">Avaliação inicial · 01/03</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">Conte o que seu treino precisa respeitar.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">Essas informações orientam a periodização e, principalmente, os limites biomecânicos. O personal revisa tudo antes da aprovação.</p>
    </header>
    <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_350px]">
      <Panel className="p-5 sm:p-7 lg:p-9">
        <form onSubmit={handleSubmit} className="space-y-9">
          <section>
            <div className="mb-6 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400"><ClipboardPlus size={19} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">Etapa 01</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Perfil e objetivo</h2></div></div>
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="field-label">Aluno</span><select className={input} value={form.userId} disabled={loadingStudents} onChange={(event) => setForm({ ...form, userId: event.target.value })} required>{loadingStudents ? <option>Carregando alunos...</option> : null}{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}</select></label>
              <label><span className="field-label">Nível de experiência</span><select className={input} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value as typeof form.experience })}><option value="BEGINNER">Iniciante</option><option value="INTERMEDIATE">Intermediário</option><option value="ADVANCED">Avançado</option></select></label>
              <fieldset className="md:col-span-2"><legend className="field-label">Sexo biológico para personalização biomecânica</legend><div className="grid gap-3 sm:grid-cols-2">{genderOptions.map((option) => { const active = form.gender === option.value; return <label key={option.value} className={`flex min-h-[76px] cursor-pointer items-center justify-between rounded-2xl border-2 px-5 transition ${active ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'}`}><input className="sr-only" type="radio" name="gender" value={option.value} checked={active} onChange={() => setForm({ ...form, gender: option.value })} /><span className={`font-bold ${active ? 'text-emerald-400' : 'text-zinc-200'}`}>{option.label}</span><span className={`grid h-6 w-6 place-items-center rounded-full border ${active ? 'border-emerald-400 bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30' : 'border-zinc-700 text-transparent'}`}><Check size={14} strokeWidth={3} /></span></label>; })}</div></fieldset>
              <label className="md:col-span-2"><span className="field-label">Objetivo principal</span><textarea className={`${input} min-h-28 resize-y`} value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} minLength={5} required placeholder="Ex.: ganhar massa muscular, melhorar postura e condicionamento..." /></label>
              <label className="md:col-span-2"><span className="flex items-center justify-between text-sm font-semibold text-zinc-200">Dias disponíveis por semana <strong className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-400">{form.weeklyDays} {form.weeklyDays === 1 ? 'dia' : 'dias'}</strong></span><input aria-label="Dias disponíveis por semana" type="range" min="1" max="7" value={form.weeklyDays} onChange={(event) => setForm({ ...form, weeklyDays: Number(event.target.value) })} className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-emerald-500" /><span className="mt-2 flex justify-between text-xs text-zinc-500"><span>1 dia</span><span>7 dias</span></span></label>
            </div>
          </section>
          <div className="h-px bg-zinc-800/80" />
          <section><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-500/10 text-rose-300"><HeartPulse size={19} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-300">Etapa 02</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Restrições e cuidados</h2></div></div><p className="mb-4 text-xs leading-6 text-zinc-400 md:text-sm">Selecione tudo que se aplica. A ausência de seleção será registrada como “sem restrições relatadas”.</p><div className="grid gap-3 sm:grid-cols-2">{restrictionOptions.map((item) => { const active = form.injuries.includes(item); return <button key={item} type="button" onClick={() => toggleRestriction(item)} className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm transition ${active ? 'border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-300' : 'border-zinc-800 bg-zinc-900/50 font-medium text-zinc-300 hover:border-zinc-700'}`}>{item}<span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-700 text-transparent'}`}><Check size={13} /></span></button>; })}</div><label className="mt-5 block"><span className="field-label">Outra restrição, cirurgia ou observação clínica</span><textarea className={`${input} min-h-24 resize-y`} value={form.customInjury} onChange={(event) => setForm({ ...form, customInjury: event.target.value })} placeholder="Descreva lado afetado, movimentos que causam desconforto e orientação profissional existente." /></label></section>
          <div className="h-px bg-zinc-800/80" />
          <section><div className="mb-5"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">Etapa 03</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Equipamentos disponíveis</h2></div><div className="grid gap-3 md:grid-cols-2">{equipmentOptions.map((item) => { const active = form.availableEquip === item; return <label key={item} className={`cursor-pointer rounded-xl border p-4 text-sm font-medium leading-6 transition ${active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700'}`}><input type="radio" name="equipment" className="sr-only" value={item} checked={active} onChange={() => setForm({ ...form, availableEquip: item })} />{item}</label>; })}</div><label className="mt-5 block"><span className="field-label">Ou descreva seu espaço</span><input className={input} value={form.availableEquip} onChange={(event) => setForm({ ...form, availableEquip: event.target.value })} required minLength={2} /></label></section>
          {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
          <div className="flex flex-col gap-4 border-t border-zinc-800/80 pt-6 sm:flex-row sm:items-center sm:justify-end"><Button type="submit" loading={submitting} disabled={!form.userId} className="w-full py-4 text-base sm:w-auto sm:min-w-60">Enviar avaliação <ChevronRight size={18} /></Button></div>
        </form>
      </Panel>
      <aside className="space-y-5 xl:sticky xl:top-28"><div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-[#131B2E] to-[#0D1322] p-6 shadow-xl shadow-black/40"><span className="inline-flex w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">Método Felipe Ferreira</span><h2 className="mt-4 text-xl font-bold text-white">Metodologia sob medida</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Acompanhamento próximo e estratégia de treino desenhada para a sua evolução.</p><ul className="mt-6 space-y-4">{['Supervisão técnica direta de Felipe Ferreira (CREF 071550-RJ)', 'Periodização baseada em sobrecarga progressiva e biomecânica', 'Prescrição individualizada, sem treinos genéricos', 'Suporte para dúvidas e ajustes de carga'].map((item) => <li key={item} className="flex gap-3 text-sm text-zinc-300"><Check size={17} className="mt-0.5 shrink-0 text-emerald-400" />{item}</li>)}</ul></div><div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200/90"><div className="flex gap-3"><CircleAlert className="mt-0.5 shrink-0" size={17} /><p><strong className="text-amber-100">Dor não é parâmetro de progresso.</strong> Em caso de sintomas agudos, procure avaliação qualificada antes de iniciar o treino.</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#111622] p-4 text-xs text-zinc-400"><ShieldCheck size={18} className="text-emerald-400" /> Seus dados orientam uma prescrição mais segura.</div></aside>
    </div>
  </main>;
}
