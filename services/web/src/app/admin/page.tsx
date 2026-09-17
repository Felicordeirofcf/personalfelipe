'use client';

import { Button, Notice, PageIntro, Panel, StatusBadge } from '@/components/ui';
import { WorkoutEditor } from '@/components/workout-editor';
import { CommercialAdminPanel } from '@/components/commercial-admin-panel';
import { apiFetch } from '@/lib/api';
import { hasRole } from '@/lib/auth';
import { Anamnesis, Workout } from '@/types';
import { Activity, BrainCircuit, CalendarDays, CircleGauge, Dumbbell, HeartPulse, RefreshCw, Scale, ShieldAlert, Sparkles, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const experienceLabels = { BEGINNER: 'Iniciante', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' };

export default function AdminPage() {
  const router = useRouter();
  const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [anamnesisData, workoutData] = await Promise.all([
        apiFetch<{ anamneses: Anamnesis[] }>('/anamnesis'),
        apiFetch<{ workouts: Workout[] }>('/workouts'),
      ]);
      setAnamneses(anamnesisData.anamneses);
      setWorkouts(workoutData.workouts);
      setSelectedWorkout((current) => {
        if (current) return workoutData.workouts.find((item) => item.id === current.id) ?? workoutData.workouts[0] ?? null;
        return workoutData.workouts.find((item) => item.status === 'DRAFT') ?? workoutData.workouts[0] ?? null;
      });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível carregar o painel.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasRole('ADMIN')) {
      router.replace('/login?next=/admin');
      return;
    }
    void loadData();
  }, [loadData, router]);

  const stats = useMemo(() => ({
    pending: anamneses.filter((item) => item.pending).length,
    drafts: workouts.filter((item) => item.status === 'DRAFT').length,
    active: workouts.filter((item) => item.status === 'ACTIVE').length,
  }), [anamneses, workouts]);

  async function generate(anamnesisId: string) {
    setGeneratingId(anamnesisId);
    setMessage({ kind: 'info', text: 'Gerando uma prescrição estruturada. Isso pode levar alguns segundos.' });
    try {
      const response = await apiFetch<{ workout: Workout; generationMode: 'mock' | 'openai' }>('/workouts/generate', {
        method: 'POST',
        body: JSON.stringify({ anamnesisId }),
      });
      setWorkouts((current) => [response.workout, ...current.filter((item) => item.id !== response.workout.id)]);
      setSelectedWorkout(response.workout);
      setAnamneses((current) => current.map((item) => item.id === anamnesisId ? { ...item, pending: false } : item));
      setMessage({ kind: 'success', text: response.generationMode === 'mock' ? 'Rascunho gerado no modo simulado local. Revise e aprove quando estiver seguro.' : 'Rascunho gerado pela OpenAI. Revise e aprove quando estiver seguro.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao gerar o treino.' });
    } finally {
      setGeneratingId(null);
    }
  }

  function handleWorkoutChange(updated: Workout) {
    setSelectedWorkout(updated);
    setWorkouts((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-10 lg:px-8 lg:py-14">
      <PageIntro
        eyebrow="Central do personal"
        title="Decisão técnica em primeiro plano."
        description="Veja novas avaliações, gere uma base com IA e ajuste cada variável antes de liberar o plano para o aluno."
        action={<Button variant="ghost" onClick={loadData} loading={loading}><RefreshCw size={17} /> Atualizar dados</Button>}
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Avaliações pendentes', value: stats.pending, icon: UserRound, color: 'bg-violet-100 text-violet-700' },
          { label: 'Planos em revisão', value: stats.drafts, icon: BrainCircuit, color: 'bg-amber-100 text-amber-700' },
          { label: 'Treinos ativos', value: stats.active, icon: Dumbbell, color: 'bg-emerald-100 text-emerald-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Panel key={label} className="flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon size={21} /></span>
            <div><p className="font-display text-3xl font-bold">{value}</p><p className="text-xs font-bold text-zinc/45">{label}</p></div>
          </Panel>
        ))}
      </div>

      {message ? <div className="mb-7"><Notice kind={message.kind}>{message.text}</Notice></div> : null}

      <CommercialAdminPanel />

      <div className="grid items-start gap-7 xl:grid-cols-[390px_1fr]">
        <div className="space-y-5 xl:sticky xl:top-28">
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-800/10 px-5 py-4">
              <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Fila de avaliações</h2><span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-black text-lime-300">{anamneses.length}</span></div>
              <p className="mt-1 text-xs text-zinc/45">Mais recentes primeiro</p>
            </div>
            <div className="max-h-[580px] space-y-3 overflow-y-auto p-3">
              {loading ? <p className="p-5 text-center text-sm font-semibold text-zinc/45">Carregando avaliações...</p> : null}
              {!loading && anamneses.length === 0 ? <p className="p-5 text-center text-sm font-semibold text-zinc/45">Nenhuma anamnese cadastrada.</p> : null}
              {anamneses.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-4 transition ${item.pending ? 'border-lime-500/40 bg-lime-50/50' : 'border-zinc-800/10 bg-[#111622]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-display font-bold">{item.user.name}</p><p className="mt-1 text-xs font-semibold text-zinc/45">{experienceLabels[item.experience]}</p></div>
                    {item.pending ? <StatusBadge status="PENDING" /> : item.latestPlan ? <StatusBadge status={item.latestPlan.status} /> : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-zinc/65">{item.goal}</p>
                  {item.latestCheckIn ? (
                    <div className={`mt-3 rounded-xl border p-3 ${item.latestCheckIn.painLevel >= 5 ? 'border-red-200 bg-red-50' : 'border-emerald-100 bg-emerald-50/60'}`}>
                      <div className="flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${item.latestCheckIn.painLevel >= 5 ? 'text-red-700' : 'text-emerald-700'}`}><HeartPulse size={13} /> Último check-in</span><span className="text-[10px] font-bold text-zinc/35">{new Date(item.latestCheckIn.createdAt).toLocaleDateString('pt-BR')}</span></div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-bold text-zinc/60"><span className="inline-flex items-center gap-1"><HeartPulse size={12} /> Dor {item.latestCheckIn.painLevel}/10</span><span className="inline-flex items-center gap-1"><Activity size={12} /> Fadiga {item.latestCheckIn.fatigueLevel}/10</span><span className="inline-flex items-center gap-1"><Scale size={12} /> {item.latestCheckIn.weightKg ? `${item.latestCheckIn.weightKg} kg` : '—'}</span></div>
                      {item.latestCheckIn.painLocation ? <p className="mt-2 truncate text-[11px] font-semibold text-zinc/50">Local: {item.latestCheckIn.painLocation}</p> : null}
                    </div>
                  ) : <p className="mt-3 rounded-xl bg-zinc-900/70 px-3 py-2 text-[11px] font-semibold text-zinc/40">Nenhum check-in registrado.</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zinc/50">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#111622] px-2 py-1"><CalendarDays size={13} /> {item.weeklyDays}x/semana</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#111622] px-2 py-1"><ShieldAlert size={13} /> {item.injuries.length} restrição(ões)</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" loading={generatingId === item.id} onClick={() => generate(item.id)}><Sparkles size={16} /> {item.pending ? 'Gerar com IA' : 'Gerar novamente'}</Button>
                    {item.latestPlan ? <button className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-800/10 bg-[#111622] text-zinc/50 hover:text-zinc" title="Abrir último plano" onClick={() => { const found = workouts.find((workout) => workout.id === item.latestPlan?.id); if (found) setSelectedWorkout(found); }}><CircleGauge size={17} /></button> : null}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          {workouts.length > 0 ? (
            <Panel className="p-4">
              <p className="mb-3 px-1 text-xs font-black uppercase tracking-wider text-zinc/45">Histórico de planos</p>
              <div className="space-y-2">
                {workouts.slice(0, 8).map((item) => (
                  <button key={item.id} onClick={() => setSelectedWorkout(item)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${selectedWorkout?.id === item.id ? 'border-zinc-800 bg-zinc-800 text-white' : 'border-zinc-800/10 bg-[#111622] hover:border-lime-500/50'}`}>
                    <span className="min-w-0"><span className="block truncate text-sm font-bold">{item.user?.name}</span><span className={`text-[10px] font-semibold ${selectedWorkout?.id === item.id ? 'text-white/45' : 'text-zinc/40'}`}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span></span>
                    <StatusBadge status={item.status} />
                  </button>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <Panel className="min-w-0 p-5 md:p-7">
          {selectedWorkout ? (
            <WorkoutEditor workout={selectedWorkout} onChange={handleWorkoutChange} />
          ) : (
            <div className="grid min-h-[520px] place-items-center p-8 text-center">
              <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-400"><BrainCircuit size={28} /></span><h2 className="mt-5 font-display text-2xl font-bold">Pronto para construir</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc/50">Escolha uma anamnese na fila e clique em “Gerar com IA”. O plano aparecerá aqui para revisão.</p></div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
