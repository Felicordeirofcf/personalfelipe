'use client';

import { Button, Notice, PageIntro, Panel, StatusBadge } from '@/components/ui';
import { WorkoutEditor } from '@/components/workout-editor';
import { WorkoutPrintSheet } from '@/components/workout-print-sheet';
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
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE'>('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [anamnesisData, workoutData] = await Promise.all([
        apiFetch<{ anamneses: Anamnesis[] }>('/anamnesis'),
        apiFetch<{ workouts: Workout[] }>('/workouts'),
      ]);
      setAnamneses(anamnesisData.anamneses);
      setWorkouts(workoutData.workouts);
      setSelectedStudentId((current) => current || anamnesisData.anamneses[0]?.user.id || '');
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

  const selectedAnamnesis = anamneses.find((item) => item.user.id === selectedStudentId) ?? null;

  useEffect(() => {
    if (!selectedStudentId) return;
    const latest = workouts.find((item) => item.userId === selectedStudentId);
    setSelectedWorkout(latest ?? null);
  }, [selectedStudentId, workouts]);

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
        body: JSON.stringify({ anamnesisId, studentId: anamneses.find((entry) => entry.id === anamnesisId)?.user.id, userId: anamneses.find((entry) => entry.id === anamnesisId)?.user.id, excludeExerciseNames: workouts.filter((item) => item.userId === anamneses.find((entry) => entry.id === anamnesisId)?.user.id).flatMap((item) => item.splits.flatMap((split) => split.exercises.map((exercise) => exercise.name))) }),
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

  const visibleAnamneses = anamneses.filter((item) => {
    const query = studentSearch.trim().toLowerCase();
    const matchesSearch = !query || item.user.name.toLowerCase().includes(query) || item.user.email.toLowerCase().includes(query);
    const matchesFilter = studentFilter === 'ALL' || (studentFilter === 'PENDING' ? item.pending : item.latestPlan?.status === 'ACTIVE');
    return matchesSearch && matchesFilter;
  });

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
          { label: 'Avaliações pendentes', value: stats.pending, icon: UserRound, color: 'bg-violet-400/10 text-violet-300' },
          { label: 'Planos em revisão', value: stats.drafts, icon: BrainCircuit, color: 'bg-amber-400/10 text-amber-300' },
          { label: 'Treinos ativos', value: stats.active, icon: Dumbbell, color: 'bg-emerald-400/10 text-emerald-300' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Panel key={label} className="flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon size={21} /></span>
            <div><p className="font-display text-3xl font-bold text-white">{value}</p><p className="text-xs font-bold text-zinc-400">{label}</p></div>
          </Panel>
        ))}
      </div>

      {message ? <div className="mb-7"><Notice kind={message.kind}>{message.text}</Notice></div> : null}

      <CommercialAdminPanel />

      <Panel className="mb-7 p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(260px,360px)_1fr] lg:items-end">
          <label className="block">
            <span className="field-label">Aluno em atendimento</span>
            <select className="field-control" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              <option value="">Selecione um aluno</option>
              {anamneses.map((item) => <option key={item.user.id} value={item.user.id}>{item.user.name} · {item.user.email}</option>)}
            </select>
          </label>
          {selectedAnamnesis ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-white">{selectedAnamnesis.user.name}</p><p className="text-xs text-zinc-400">{selectedAnamnesis.user.email}</p></div><StatusBadge status={selectedAnamnesis.latestPlan?.status ?? 'PENDING'} /></div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-300 sm:grid-cols-3"><span><b className="text-zinc-500">Objetivo</b><br />{selectedAnamnesis.goal}</span><span><b className="text-zinc-500">Frequência</b><br />{selectedAnamnesis.weeklyDays}x por semana</span><span><b className="text-zinc-500">Restrições</b><br />{selectedAnamnesis.injuries.length ? selectedAnamnesis.injuries.join(', ') : 'Nenhuma informada'}</span></div>
          </div> : <p className="text-sm text-zinc-400">Selecione um aluno para carregar a anamnese, o histórico e o plano atual.</p>}
        </div>
      </Panel>

      <div className="grid items-start gap-7 xl:grid-cols-[390px_1fr]">
        <div className="space-y-5 xl:sticky xl:top-28">
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-white">Fila de avaliações</h2><span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-emerald-300">{anamneses.length}</span></div>
              <p className="mt-1 text-xs text-zinc-400">Mais recentes primeiro</p>
              <input className="field-control mt-4" placeholder="Buscar aluno..." value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => setStudentFilter('ALL')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${studentFilter === 'ALL' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>Todos</button><button type="button" onClick={() => setStudentFilter('PENDING')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${studentFilter === 'PENDING' ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>Pendentes</button><button type="button" onClick={() => setStudentFilter('ACTIVE')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${studentFilter === 'ACTIVE' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>Liberados</button></div>
            </div>
            <div className="max-h-[580px] space-y-3 overflow-y-auto p-3">
              {loading ? <p className="p-5 text-center text-sm font-semibold text-zinc-400">Carregando avaliações...</p> : null}
              {!loading && anamneses.length === 0 ? <p className="p-5 text-center text-sm font-semibold text-zinc-400">Nenhuma anamnese cadastrada.</p> : null}
              {visibleAnamneses.map((item) => (
                <article key={item.id} role="button" tabIndex={0} onClick={() => router.push(`/admin/aluno/${item.user.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') router.push(`/admin/aluno/${item.user.id}`); }} className={`cursor-pointer rounded-2xl border p-4 transition hover:border-emerald-400/50 ${item.pending ? 'border-emerald-400/40 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-display font-bold text-white">{item.user.name}</p><p className="mt-1 text-xs font-semibold text-zinc-400">{experienceLabels[item.experience]}</p></div>
                    {item.pending ? <StatusBadge status="PENDING" /> : item.latestPlan ? <StatusBadge status={item.latestPlan.status} /> : null}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-zinc-300">{item.goal}</p>
                  {item.latestCheckIn ? (
                    <div className={`mt-3 rounded-xl border p-3 ${item.latestCheckIn.painLevel >= 5 ? 'border-red-500/30 bg-red-950/30' : 'border-emerald-500/25 bg-emerald-950/20'}`}>
                      <div className="flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${item.latestCheckIn.painLevel >= 5 ? 'text-red-300' : 'text-emerald-300'}`}><HeartPulse size={13} /> Último check-in</span><span className="text-[10px] font-bold text-zinc-500">{new Date(item.latestCheckIn.createdAt).toLocaleDateString('pt-BR')}</span></div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-bold text-zinc-300"><span className="inline-flex items-center gap-1"><HeartPulse size={12} /> Dor {item.latestCheckIn.painLevel}/10</span><span className="inline-flex items-center gap-1"><Activity size={12} /> Fadiga {item.latestCheckIn.fatigueLevel}/10</span><span className="inline-flex items-center gap-1"><Scale size={12} /> {item.latestCheckIn.weightKg ? `${item.latestCheckIn.weightKg} kg` : '—'}</span></div>
                      {item.latestCheckIn.painLocation ? <p className="mt-2 truncate text-[11px] font-semibold text-zinc-400">Local: {item.latestCheckIn.painLocation}</p> : null}
                    </div>
                  ) : <p className="mt-3 rounded-xl bg-zinc-900/70 px-3 py-2 text-[11px] font-semibold text-zinc-400">Nenhum check-in registrado.</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-zinc-400">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-zinc-300"><CalendarDays size={13} /> {item.weeklyDays}x/semana</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-zinc-300"><ShieldAlert size={13} /> {item.injuries.length} restrição(ões)</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" loading={generatingId === item.id} onClick={(event) => { event.stopPropagation(); void generate(item.id); }}><Sparkles size={16} /> {item.pending ? 'Gerar com IA' : 'Gerar novamente'}</Button>
                    {item.latestPlan ? <button className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white" title="Abrir último plano" onClick={(event) => { event.stopPropagation(); const found = workouts.find((workout) => workout.id === item.latestPlan?.id); if (found) setSelectedWorkout(found); }}><CircleGauge size={17} /></button> : null}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          {workouts.length > 0 ? (
            <Panel className="p-4">
              <p className="mb-3 px-1 text-xs font-black uppercase tracking-wider text-zinc-400">Histórico de planos</p>
              <div className="space-y-2">
                {workouts.slice(0, 8).map((item) => (
                  <button key={item.id} onClick={() => setSelectedWorkout(item)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${selectedWorkout?.id === item.id ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-900/60 hover:border-emerald-500/50'}`}>
                    <span className="min-w-0"><span className="block truncate text-sm font-bold">{item.user?.name}</span><span className={`text-[10px] font-semibold ${selectedWorkout?.id === item.id ? 'text-zinc-800' : 'text-zinc-400'}`}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span></span>
                    <StatusBadge status={item.status} />
                  </button>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <Panel className="min-w-0 p-5 md:p-7">
          {selectedWorkout ? (
            <>
              <WorkoutEditor workout={selectedWorkout} onChange={handleWorkoutChange} />
              <WorkoutPrintSheet
                workout={selectedWorkout}
                profile={(() => {
                  const profile = anamneses.find((item) => item.user.id === selectedWorkout.userId);
                  return profile ? { goal: profile.goal, weeklyDays: profile.weeklyDays } : null;
                })()}
              />
            </>
          ) : (
            <div className="grid min-h-[520px] place-items-center p-8 text-center">
              <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-300"><BrainCircuit size={28} /></span><h2 className="mt-5 font-display text-2xl font-bold">Pronto para construir</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">Escolha uma anamnese na fila e clique em “Gerar com IA”. O plano aparecerá aqui para revisão.</p></div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
