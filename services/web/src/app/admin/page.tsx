'use client';

import { Button, Notice, PageIntro, Panel, StatusBadge } from '@/components/ui';
import { WorkoutEditor } from '@/components/workout-editor';
import { WorkoutPrintSheet } from '@/components/workout-print-sheet';
import { CommercialAdminPanel } from '@/components/commercial-admin-panel';
import { apiFetch } from '@/lib/api';
import { hasRole } from '@/lib/auth';
import { Anamnesis, Workout } from '@/types';
import { 
  Activity, 
  BrainCircuit, 
  CalendarDays, 
  CheckCircle2, 
  CircleGauge, 
  Dumbbell, 
  HeartPulse, 
  RefreshCw, 
  Scale, 
  Search, 
  ShieldAlert, 
  Sparkles, 
  UserRound 
} from 'lucide-react';
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
      const targetUser = anamneses.find((entry) => entry.id === anamnesisId)?.user;
      const response = await apiFetch<{ workout: Workout; generationMode: 'mock' | 'openai' }>('/workouts/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          anamnesisId, 
          studentId: targetUser?.id, 
          userId: targetUser?.id, 
          excludeExerciseNames: workouts
            .filter((item) => item.userId === targetUser?.id)
            .flatMap((item) => item.splits.flatMap((split) => split.exercises.map((exercise) => exercise.name))) 
        }),
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
        description="Veja novas avaliações, selecione o aluno diretamente na lista e ajuste cada variável antes de liberar o plano."
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

      {/* CARD DO ALUNO SELECIONADO (Substitui o menu dropdown) */}
      <Panel className="mb-7 p-5 md:p-6 border-emerald-500/20 bg-zinc-950/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Aluno em atendimento selecionado
            </span>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-white">
                {selectedAnamnesis ? selectedAnamnesis.user.name : 'Nenhum aluno selecionado'}
              </h2>
              {selectedAnamnesis && (
                <StatusBadge status={selectedAnamnesis.latestPlan?.status ?? (selectedAnamnesis.pending ? 'PENDING' : 'ACTIVE')} />
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {selectedAnamnesis ? selectedAnamnesis.user.email : 'Clique em qualquer aluno na lista abaixo para carregar sua ficha técnica.'}
            </p>
          </div>

          {selectedAnamnesis && (
            <div className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs">
              <div>
                <b className="block text-zinc-500">Objetivo</b>
                <span className="text-zinc-200">{selectedAnamnesis.goal}</span>
              </div>
              <div>
                <b className="block text-zinc-500">Frequência</b>
                <span className="text-zinc-200">{selectedAnamnesis.weeklyDays}x por semana</span>
              </div>
              <div>
                <b className="block text-zinc-500">Restrições</b>
                <span className="text-zinc-200">
                  {selectedAnamnesis.injuries.length ? selectedAnamnesis.injuries.join(', ') : 'Nenhuma'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid items-start gap-7 xl:grid-cols-[400px_1fr]">
        <div className="space-y-5 xl:sticky xl:top-28">
          <Panel className="overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">Fila de alunos</h2>
                <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                  {visibleAnamneses.length} de {anamneses.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">Clique no card para carregar o aluno</p>

              {/* Barra de Pesquisa Rápida */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
                <input 
                  className="field-control pl-9 text-sm" 
                  placeholder="Buscar por nome ou e-mail..." 
                  value={studentSearch} 
                  onChange={(event) => setStudentSearch(event.target.value)} 
                />
              </div>

              {/* Filtros de Status */}
              <div className="mt-3 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setStudentFilter('ALL')} 
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${studentFilter === 'ALL' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  Todos
                </button>
                <button 
                  type="button" 
                  onClick={() => setStudentFilter('PENDING')} 
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${studentFilter === 'PENDING' ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  Pendentes
                </button>
                <button 
                  type="button" 
                  onClick={() => setStudentFilter('ACTIVE')} 
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${studentFilter === 'ACTIVE' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  Liberados
                </button>
              </div>
            </div>

            {/* Lista Rolável com Seleção Ativa */}
            <div className="max-h-[620px] space-y-3 overflow-y-auto p-3">
              {loading ? <p className="p-5 text-center text-sm font-semibold text-zinc-400">Carregando avaliações...</p> : null}
              {!loading && visibleAnamneses.length === 0 ? <p className="p-5 text-center text-sm font-semibold text-zinc-400">Nenhum aluno encontrado.</p> : null}
              
              {visibleAnamneses.map((item) => {
                const isSelected = item.user.id === selectedStudentId;

                return (
                  <article 
                    key={item.id} 
                    role="button" 
                    tabIndex={0} 
                    onClick={() => setSelectedStudentId(item.user.id)} 
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedStudentId(item.user.id); }} 
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected 
                        ? 'border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400' 
                        : item.pending 
                        ? 'border-emerald-400/30 bg-emerald-950/10 hover:border-emerald-400/60' 
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-display font-bold ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                            {item.user.name}
                          </p>
                          {isSelected && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-zinc-400">{item.user.email}</p>
                        <p className="mt-1 text-[11px] font-bold text-zinc-500">{experienceLabels[item.experience]}</p>
                      </div>
                      {item.pending ? <StatusBadge status="PENDING" /> : item.latestPlan ? <StatusBadge status={item.latestPlan.status} /> : null}
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-300">{item.goal}</p>

                    {item.latestCheckIn ? (
                      <div className={`mt-3 rounded-xl border p-2.5 ${item.latestCheckIn.painLevel >= 5 ? 'border-red-500/30 bg-red-950/30' : 'border-emerald-500/25 bg-emerald-950/20'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${item.latestCheckIn.painLevel >= 5 ? 'text-red-300' : 'text-emerald-300'}`}>
                            <HeartPulse size={12} /> Check-in
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">{new Date(item.latestCheckIn.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] font-bold text-zinc-300">
                          <span>Dor: {item.latestCheckIn.painLevel}/10</span>
                          <span>Fadiga: {item.latestCheckIn.fatigueLevel}/10</span>
                          <span>{item.latestCheckIn.weightKg ? `${item.latestCheckIn.weightKg} kg` : '—'}</span>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold text-zinc-400">
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                        <CalendarDays size={11} /> {item.weeklyDays}x/sem
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                        <ShieldAlert size={11} /> {item.injuries.length} restrição(ões)
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button 
                        className="flex-1 text-xs py-2" 
                        loading={generatingId === item.id} 
                        onClick={(event) => { 
                          event.stopPropagation(); 
                          setSelectedStudentId(item.user.id);
                          void generate(item.id); 
                        }}
                      >
                        <Sparkles size={14} /> {item.pending ? 'Gerar com IA' : 'Regerar IA'}
                      </Button>
                      
                      {item.latestPlan && (
                        <button 
                          className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white" 
                          title="Abrir treino atual" 
                          onClick={(event) => { 
                            event.stopPropagation(); 
                            setSelectedStudentId(item.user.id);
                            const found = workouts.find((workout) => workout.id === item.latestPlan?.id); 
                            if (found) setSelectedWorkout(found); 
                          }}
                        >
                          <CircleGauge size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          {workouts.length > 0 && (
            <Panel className="p-4">
              <p className="mb-3 px-1 text-xs font-black uppercase tracking-wider text-zinc-400">Histórico de planos</p>
              <div className="space-y-2">
                {workouts.slice(0, 8).map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => {
                      setSelectedWorkout(item);
                      if (item.userId) setSelectedStudentId(item.userId);
                    }} 
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${selectedWorkout?.id === item.id ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-900/60 hover:border-emerald-500/50'}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{item.user?.name}</span>
                      <span className={`text-[10px] font-semibold ${selectedWorkout?.id === item.id ? 'text-zinc-800' : 'text-zinc-400'}`}>
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                  </button>
                ))}
              </div>
            </Panel>
          )}
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
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-300">
                  <BrainCircuit size={28} />
                </span>
                <h2 className="mt-5 font-display text-2xl font-bold text-white">Pronto para construir</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                  Selecione um aluno na lista ao lado e clique em “Gerar com IA” ou abra um plano do histórico para começar a edição técnica.
                </p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
