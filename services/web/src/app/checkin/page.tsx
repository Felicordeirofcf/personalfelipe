'use client';

import { Button, Notice, PageIntro, Panel } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { CheckIn, User } from '@/types';
import { Activity, CalendarCheck2, ChevronRight, HeartPulse, Scale, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

const painLocations = [
  'Sem dor localizada',
  'Ombro direito',
  'Ombro esquerdo',
  'Coluna cervical',
  'Coluna lombar',
  'Quadril',
  'Joelho direito',
  'Joelho esquerdo',
  'Tornozelo / pé',
  'Outro local',
];

export default function CheckInPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    userId: '',
    painLevel: 0,
    painLocation: painLocations[0],
    fatigueLevel: 4,
    weightKg: '',
    notes: '',
  });

  useEffect(() => {
    apiFetch<{ users: User[] }>('/users?role=STUDENT')
      .then(({ users }) => {
        setStudents(users);
        if (users[0]) setForm((current) => ({ ...current, userId: users[0].id }));
      })
      .catch((error: Error) => setMessage({ kind: 'error', text: error.message }));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ checkIn: CheckIn }>('/student/checkin', {
        method: 'POST',
        body: JSON.stringify({
          userId: form.userId,
          painLevel: form.painLevel,
          ...(form.painLocation !== painLocations[0] ? { painLocation: form.painLocation } : {}),
          fatigueLevel: form.fatigueLevel,
          ...(form.weightKg ? { weightKg: Number(form.weightKg) } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
          photoUrls: [],
        }),
      });
      setMessage({ kind: 'success', text: `Check-in de ${new Date(response.checkIn.createdAt).toLocaleDateString('pt-BR')} enviado ao personal.` });
      setForm((current) => ({ ...current, notes: '' }));
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível enviar o check-in.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <PageIntro
        eyebrow="Acompanhamento periódico"
        title="Como seu corpo respondeu aos treinos?"
        description="Registre dor, fadiga e peso em menos de dois minutos. Seu personal usa esse histórico para ajustar volume, intensidade e recuperação."
      />

      <div className="grid items-start gap-7 lg:grid-cols-[1fr_330px]">
        <Panel className="p-6 md:p-9">
          <form onSubmit={handleSubmit} className="space-y-8">
            <label className="block">
              <span className="field-label">Aluno</span>
              <select className="field-control" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} required>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}
              </select>
            </label>

            <section className="rounded-3xl border border-red-100 bg-red-50/55 p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-red-100 text-red-700"><HeartPulse size={20} /></span><div><p className="text-xs font-black uppercase tracking-wider text-red-700">Dor articular</p><h2 className="font-display text-xl font-bold">Nível percebido</h2></div></div>
                <span className={`grid h-14 w-14 place-items-center rounded-2xl text-xl font-black ${form.painLevel >= 5 ? 'bg-red-600 text-white' : 'bg-white text-red-700'}`}>{form.painLevel}</span>
              </div>
              <input aria-label="Nível de dor" type="range" min="0" max="10" value={form.painLevel} onChange={(event) => setForm({ ...form, painLevel: Number(event.target.value) })} className="mt-6 w-full accent-red-600" />
              <div className="mt-2 flex justify-between text-[11px] font-bold text-ink/40"><span>0 · sem dor</span><span>10 · dor máxima</span></div>
              <label className="mt-5 block"><span className="field-label">Local da dor</span><select className="field-control" value={form.painLocation} onChange={(event) => setForm({ ...form, painLocation: event.target.value })}>{painLocations.map((location) => <option key={location}>{location}</option>)}</select></label>
            </section>

            <section className="rounded-3xl border border-amber-100 bg-amber-50/55 p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Activity size={20} /></span><div><p className="text-xs font-black uppercase tracking-wider text-amber-700">Fadiga geral</p><h2 className="font-display text-xl font-bold">Nível percebido</h2></div></div>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-xl font-black text-amber-700">{form.fatigueLevel}</span>
              </div>
              <input aria-label="Nível de fadiga" type="range" min="0" max="10" value={form.fatigueLevel} onChange={(event) => setForm({ ...form, fatigueLevel: Number(event.target.value) })} className="mt-6 w-full accent-amber-600" />
              <div className="mt-2 flex justify-between text-[11px] font-bold text-ink/40"><span>0 · recuperado</span><span>10 · exausto</span></div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <label><span className="field-label"><Scale size={15} className="mr-1 inline" /> Peso corporal (kg)</span><input type="number" min="20" max="500" step="0.1" className="field-control" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} placeholder="Ex.: 78,4" /></label>
              <label className="md:col-span-2"><span className="field-label">Observações da semana</span><textarea className="field-control min-h-28 resize-y" maxLength={1000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Qualidade do sono, exercícios desconfortáveis, energia e evolução percebida..." /></label>
            </div>

            {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
            <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-ink/10 pt-6 sm:flex-row sm:items-center">
              <p className="max-w-md text-xs leading-5 text-ink/45">Dor intensa ou persistente deve ser avaliada por profissional de saúde. O check-in não substitui avaliação clínica.</p>
              <Button type="submit" loading={submitting} disabled={!form.userId} className="min-w-52">Enviar check-in <ChevronRight size={18} /></Button>
            </div>
          </form>
        </Panel>

        <aside className="space-y-5 lg:sticky lg:top-28">
          <Panel className="!bg-ink p-6 text-white">
            <CalendarCheck2 className="text-lime-300" size={27} />
            <h3 className="mt-4 font-display text-2xl font-bold">Crie uma linha do tempo.</h3>
            <p className="mt-3 text-sm leading-6 text-white/60">Um registro semanal ou quinzenal permite comparar sintomas e recuperação com as mudanças do plano.</p>
          </Panel>
          <div className="rounded-3xl bg-mint p-6 text-lime-900">
            <div className="flex items-center gap-2"><ShieldCheck size={20} /><h3 className="font-display font-bold">Sinal de atenção</h3></div>
            <p className="mt-3 text-sm leading-6 text-lime-900/70">Check-ins com dor igual ou superior a 5 recebem destaque vermelho no painel do personal.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
