'use client';

import { apiFetch } from '@/lib/api';
import { Button, Notice, PageIntro, Panel } from '@/components/ui';
import { User } from '@/types';
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
  const [students, setStudents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
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
    apiFetch<{ users: User[] }>('/users?role=STUDENT')
      .then(({ users }) => {
        setStudents(users);
        if (users[0]) setForm((current) => ({ ...current, userId: users[0].id }));
      })
      .catch((error: Error) => setMessage({ kind: 'error', text: error.message }))
      .finally(() => setLoadingStudents(false));
  }, []);

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
      setMessage({ kind: 'success', text: 'Anamnese enviada. O personal já pode gerar o rascunho do treino.' });
      window.setTimeout(() => router.push('/admin'), 900);
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
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-lime-700"><ClipboardPlus size={19} /></span>
                <div><p className="text-xs font-black uppercase tracking-wider text-lime-700">Etapa 01</p><h2 className="font-display text-xl font-bold">Perfil e objetivo</h2></div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="field-label">Aluno</span>
                  <select className="field-control" value={form.userId} disabled={loadingStudents} onChange={(event) => setForm({ ...form, userId: event.target.value })} required>
                    {loadingStudents ? <option>Carregando alunos...</option> : null}
                    {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.email}</option>)}
                  </select>
                </label>
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
                    {([{ value: 'FEMALE', label: 'Feminino', description: 'Ênfase em glúteos e membros inferiores' }, { value: 'MALE', label: 'Masculino', description: 'Ênfase equilibrada em tronco e pernas' }] as const).map((option) => (
                      <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 transition ${form.gender === option.value ? 'border-lime-600 bg-lime-50' : 'border-ink/10 bg-white hover:border-lime-500/50'}`}>
                        <input className="sr-only" type="radio" name="gender" value={option.value} checked={form.gender === option.value} onChange={() => setForm({ ...form, gender: option.value })} />
                        <strong className="block">{option.label}</strong><span className="text-xs text-ink/55">{option.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="md:col-span-2">
                  <span className="field-label">Objetivo principal</span>
                  <textarea className="field-control min-h-28 resize-y" value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} minLength={5} required placeholder="Ex.: ganhar massa muscular, melhorar postura e condicionamento..." />
                </label>
                <label className="md:col-span-2">
                  <span className="field-label">Dias disponíveis por semana: <strong className="text-lime-700">{form.weeklyDays}</strong></span>
                  <input type="range" min="1" max="6" value={form.weeklyDays} onChange={(event) => setForm({ ...form, weeklyDays: Number(event.target.value) })} className="w-full accent-lime-600" />
                  <div className="mt-1 flex justify-between text-xs font-bold text-ink/35"><span>1 dia</span><span>6 dias</span></div>
                </label>
              </div>
            </section>

            <div className="h-px bg-ink/10" />

            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-700"><HeartPulse size={19} /></span>
                <div><p className="text-xs font-black uppercase tracking-wider text-orange-700">Etapa 02</p><h2 className="font-display text-xl font-bold">Restrições e cuidados</h2></div>
              </div>
              <p className="mb-4 text-sm leading-6 text-ink/55">Selecione tudo que se aplica. A ausência de seleção será registrada como “sem restrições relatadas”.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {restrictionOptions.map((item) => {
                  const active = form.injuries.includes(item);
                  return (
                    <button key={item} type="button" onClick={() => toggleRestriction(item)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${active ? 'border-lime-500 bg-lime-50 text-lime-800' : 'border-ink/10 bg-white text-ink/65 hover:border-lime-500/50'}`}>
                      {item}<span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-lime-600 bg-lime-600 text-white' : 'border-ink/20'}`}>{active ? <Check size={13} /> : null}</span>
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
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-lime-700">Etapa 03</p>
              <h2 className="font-display text-xl font-bold">Equipamentos disponíveis</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {equipmentOptions.map((item) => (
                  <label key={item} className={`cursor-pointer rounded-2xl border p-4 text-sm font-bold leading-6 transition ${form.availableEquip === item ? 'border-ink bg-ink text-white' : 'border-ink/10 bg-white text-ink/65 hover:border-ink/30'}`}>
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

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center">
              <p className="max-w-md text-xs leading-5 text-ink/45">Este sistema auxilia a prescrição, mas não substitui avaliação médica, fisioterapêutica ou o julgamento do profissional responsável.</p>
              <Button type="submit" loading={submitting} disabled={!form.userId} className="sm:min-w-52">
                Enviar ao personal <ChevronRight size={18} />
              </Button>
            </div>
          </form>
        </Panel>

        <aside className="space-y-5">
          <Panel className="overflow-hidden !bg-ink p-6 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-lime-300">Privacidade por padrão</p>
            <h3 className="mt-3 font-display text-2xl font-bold">Informação útil, sem ruído.</h3>
            <p className="mt-3 text-sm leading-6 text-white/60">O modelo recebe apenas os dados necessários à prescrição. A saída passa por validação estrutural antes de entrar no sistema.</p>
            <div className="mt-6 space-y-3">
              {['Schema Zod estrito', 'Restrições incluídas no prompt', 'Aprovação humana obrigatória'].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold"><Check size={16} className="text-lime-300" /> {item}</div>)}
            </div>
          </Panel>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-900">
            <div className="flex gap-3"><CircleAlert className="mt-0.5 shrink-0" size={19} /><p className="text-sm leading-6"><strong>Dor não é parâmetro de progresso.</strong> Em caso de sintomas agudos, procure avaliação qualificada antes de iniciar o treino.</p></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
