'use client';

import { Button, Notice, PageIntro, Panel } from '@/components/ui';
import { WorkoutPrintSheet } from '@/components/workout-print-sheet';
import { apiFetch } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { LastWorkoutLog, Workout, WorkoutLog } from '@/types';
import { Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, Gauge, History, Layers3, Play, Printer, RefreshCw, Target, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type SetEntry = { weightUsed: string; repsDone: string; rpe: string; saved?: boolean; saving?: boolean };
type VideoModal = { name: string; url: string } | null;
type PrescriptionProfile = { goal: string; weeklyDays: number };

function previousPerformance(log: LastWorkoutLog | null) {
  if (!log) return 'Primeira sessão registrada';
  const rir = log.rpe === null ? '—' : Math.max(0, 10 - log.rpe).toFixed(log.rpe % 1 ? 1 : 0);
  return `Último treino: ${log.weightUsed} kg × ${log.repsDone} reps (RIR ${rir})`;
}

function videoSource(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') && parsed.searchParams.get('v')) {
      return { kind: 'iframe' as const, src: `https://www.youtube.com/embed/${parsed.searchParams.get('v')}` };
    }
    if (parsed.hostname === 'youtu.be') {
      return { kind: 'iframe' as const, src: `https://www.youtube.com/embed/${parsed.pathname.slice(1)}` };
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(parsed.pathname)) return { kind: 'video' as const, src: url };
    return { kind: 'iframe' as const, src: url };
  } catch {
    return { kind: 'iframe' as const, src: url };
  }
}

export default function TreinoPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [prescriptionProfile, setPrescriptionProfile] = useState<PrescriptionProfile | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [activeSplit, setActiveSplit] = useState(0);
  const [entries, setEntries] = useState<Record<string, SetEntry>>({});
  const [video, setVideo] = useState<VideoModal>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadWorkout = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ workout: Workout; prescriptionProfile: PrescriptionProfile; recentLogs: WorkoutLog[] }>(`/student/active-workout/${userId}`);
      setWorkout(response.workout);
      setPrescriptionProfile(response.prescriptionProfile);
      setLogs(response.recentLogs);
      setActiveSplit(0);
      setEntries({});
    } catch (error) {
      setWorkout(null);
      setPrescriptionProfile(null);
      setLogs([]);
      setMessage({ kind: 'info', text: error instanceof Error ? error.message : 'Treino ativo não encontrado.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser || sessionUser.role !== 'STUDENT') {
      router.replace('/login?next=/treino');
      return;
    }
    setStudentId(sessionUser.id);
    void loadWorkout(sessionUser.id);
  }, [loadWorkout, router]);

  const currentSplit = workout?.splits[activeSplit];
  const completedSets = useMemo(() => Object.entries(entries).filter(([entryKey, entry]) => entryKey.startsWith(`${activeSplit}:`) && entry.saved).length, [activeSplit, entries]);
  const totalSets = currentSplit?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  function key(exerciseName: string, setNumber: number) {
    return `${activeSplit}:${exerciseName}:${setNumber}`;
  }

  function updateEntry<K extends keyof SetEntry>(exerciseName: string, setNumber: number, field: K, value: SetEntry[K]) {
    const entryKey = key(exerciseName, setNumber);
    setEntries((current) => {
      const previous = current[entryKey] ?? { weightUsed: '', repsDone: '', rpe: '' };
      return { ...current, [entryKey]: { ...previous, [field]: value } };
    });
  }

  async function saveSet(exerciseName: string, setNumber: number) {
    const entryKey = key(exerciseName, setNumber);
    const entry = entries[entryKey];
    if (!entry) return;
    updateEntry(exerciseName, setNumber, 'saving', true);
    try {
      const response = await apiFetch<{ log: WorkoutLog }>('/workouts/log', {
        method: 'POST',
        body: JSON.stringify({
          userId: studentId,
          exercise: exerciseName,
          setNumber,
          weightUsed: entry.weightUsed === '' ? null : Number(entry.weightUsed),
          repsDone: entry.repsDone === '' ? null : Number(entry.repsDone),
          ...(entry.rpe !== '' ? { rpe: Number(entry.rpe) } : {}),
        }),
      });
      setLogs((current) => [response.log, ...current]);
      setWorkout((current) => current ? {
        ...current,
        splits: current.splits.map((split) => ({
          ...split,
          exercises: split.exercises.map((exercise) => exercise.name === exerciseName ? {
            ...exercise,
            lastLog: {
              weightUsed: response.log.weightUsed,
              repsDone: response.log.repsDone,
              rpe: response.log.rpe,
              loggedAt: response.log.loggedAt,
            },
          } : exercise),
        })),
      } : current);
      setEntries((current) => {
        const previous = current[entryKey] ?? { weightUsed: '', repsDone: '', rpe: '' };
        return { ...current, [entryKey]: { ...previous, saving: false, saved: true } };
      });
      setMessage({ kind: 'success', text: `${exerciseName}, série ${setNumber}, registrada.` });
    } catch (error) {
      updateEntry(exerciseName, setNumber, 'saving', false);
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao registrar a série.' });
    }
  }

  async function completeWorkout() {
    if (!currentSplit) return;
    try {
      await Promise.all(currentSplit.exercises.flatMap((exercise) => Array.from({ length: exercise.sets }, (_, index) => apiFetch('/workouts/log', {
        method: 'POST',
        body: JSON.stringify({ userId: studentId, exercise: exercise.name, setNumber: index + 1, weightUsed: null, repsDone: null }),
      }))));
      await apiFetch('/student/workout/complete', {
        method: 'POST',
        body: JSON.stringify({ userId: studentId, workoutId: workout?.id, dayTitle: currentSplit.name }),
      });
      setMessage({ kind: 'success', text: `${currentSplit.name} concluído sem exigir o preenchimento de cargas.` });
      setEntries((current) => ({ ...current, ...Object.fromEntries(currentSplit.exercises.flatMap((exercise) => Array.from({ length: exercise.sets }, (_, index) => [key(exercise.name, index + 1), { weightUsed: '', repsDone: '', rpe: '', saved: true } as SetEntry])))}));
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível concluir o treino.' }); }
  }

  const activeVideo = video ? videoSource(video.url) : null;

  return (
    <>
      <div className="screen-only mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <PageIntro
          eyebrow="Área do aluno"
          title="Seu treino, série por série."
          description="Consulte a prescrição aprovada, recupere a última carga e registre a execução para criar uma progressão confiável."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => loadWorkout(studentId)} loading={loading} aria-label="Atualizar treino"><RefreshCw size={17} /></Button>
              <Button variant="dark" onClick={() => window.print()} disabled={!workout}><Printer size={17} /> Imprimir / Salvar PDF</Button>
            </div>
          }
        />

        {message ? <div className="mb-6"><Notice kind={message.kind}>{message.text}</Notice></div> : null}
        {loading ? <Panel className="grid min-h-96 place-items-center p-8 text-sm font-bold text-zinc-400">Carregando seu plano...</Panel> : null}
        {!loading && !workout ? <Panel className="grid min-h-96 place-items-center p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-300"><Dumbbell size={28} /></span><h2 className="mt-5 font-display text-2xl font-bold">Seu treino ainda não foi liberado</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">Se você acabou de contratar, preencha a <a href="/anamnese" className="font-extrabold text-emerald-300 underline">anamnese biomecânica</a>. Depois, aguarde a revisão e a liberação do seu treinador.</p></div></Panel> : null}

        {workout && currentSplit ? (
          <div className="grid items-start gap-7 lg:grid-cols-[1fr_290px]">
            <div className="min-w-0 space-y-6">
              <Panel className="overflow-hidden">
                <div className="grid-texture bg-zinc-950 p-6 text-white md:p-8">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">{currentSplit.name}</p><h2 className="mt-2 font-display text-3xl font-bold">{currentSplit.focus}</h2><div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-white/60"><span className="inline-flex items-center gap-1.5"><Layers3 size={15} /> {currentSplit.exercises.length} exercícios</span><span className="inline-flex items-center gap-1.5"><Target size={15} /> {totalSets} séries</span></div></div>
                    <Button variant="primary" onClick={completeWorkout}>Concluir Treino Completo</Button>
                    <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 md:w-48"><div className="flex items-center justify-between text-xs font-bold"><span>Progresso</span><span className="text-emerald-300">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div></div>
                  </div>
                </div>

                <div className="space-y-5 p-4 md:p-6">
                  {currentSplit.exercises.map((exercise, exerciseIndex) => (
                    <article key={exercise.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
                      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 bg-zinc-900/70 p-4 md:flex-row md:items-start">
                        <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900/70 text-xs font-black text-white shadow-sm">{String(exerciseIndex + 1).padStart(2, '0')}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-bold">{exercise.name}</h3>{exercise.videoUrl ? <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20" title="Abrir vídeo de execução"><Play size={13} fill="currentColor" /> Ver vídeo</a> : null}</div><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold ${exercise.lastLog ? 'bg-emerald-950/50 text-emerald-200' : 'bg-zinc-900/70 text-zinc-400'}`}>{previousPerformance(exercise.lastLog)}</span><p className="mt-2 text-xs leading-5 text-zinc-400">{exercise.notes || 'Execução controlada, sem compensações ou dor.'}</p></div></div>
                        <div className="flex shrink-0 gap-2 text-[11px] font-extrabold text-zinc-300"><span className="rounded-lg bg-zinc-900/70 px-2.5 py-1.5">{exercise.reps} reps</span><span className="rounded-lg bg-zinc-900/70 px-2.5 py-1.5">RIR {exercise.rir}</span><span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900/70 px-2.5 py-1.5"><Clock3 size={12} /> {exercise.restSeconds}s</span></div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-sm"><thead className="text-[10px] font-black uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Série</th><th className="px-2 py-3">Carga (kg)</th><th className="px-2 py-3">Repetições</th><th className="px-2 py-3">RPE (0–10)</th><th className="px-4 py-3 text-right">Status</th></tr></thead><tbody>
                          {Array.from({ length: exercise.sets }, (_, setIndex) => {
                            const setNumber = setIndex + 1;
                            const entry = entries[key(exercise.name, setNumber)] ?? { weightUsed: '', repsDone: '', rpe: '' };
                            return <tr key={setNumber} className="border-t border-zinc-800/70"><td className="px-4 py-3 font-black">{setNumber}</td><td className="p-2"><input type="number" min="0" step="0.5" disabled={entry.saved} value={entry.weightUsed} onChange={(event) => updateEntry(exercise.name, setNumber, 'weightUsed', event.target.value)} className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:bg-emerald-950/40" placeholder={exercise.lastLog ? String(exercise.lastLog.weightUsed) : '0'} /></td><td className="p-2"><input type="number" min="0" disabled={entry.saved} value={entry.repsDone} onChange={(event) => updateEntry(exercise.name, setNumber, 'repsDone', event.target.value)} className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:bg-emerald-950/40" placeholder={exercise.lastLog ? String(exercise.lastLog.repsDone) : '0'} /></td><td className="p-2"><input type="number" min="0" max="10" step="0.5" disabled={entry.saved} value={entry.rpe} onChange={(event) => updateEntry(exercise.name, setNumber, 'rpe', event.target.value)} className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:bg-emerald-950/40" placeholder="Opcional" /></td><td className="px-4 py-3 text-right"><Button variant={entry.saved ? 'ghost' : 'dark'} disabled={entry.saved} loading={entry.saving} onClick={() => saveSet(exercise.name, setNumber)} className="min-h-9 px-3 py-1.5 text-xs">{entry.saved ? <><Check size={14} /> Concluída</> : 'Concluir'}</Button></td></tr>;
                          })}
                        </tbody></table>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>

              <div className="flex items-center justify-between gap-3"><Button variant="ghost" disabled={activeSplit === 0} onClick={() => setActiveSplit((value) => value - 1)}><ChevronLeft size={17} /> Anterior</Button><p className="text-xs font-bold text-zinc-400">Treino {activeSplit + 1} de {workout.splits.length}</p><Button variant="dark" disabled={activeSplit === workout.splits.length - 1} onClick={() => setActiveSplit((value) => value + 1)}>Próximo <ChevronRight size={17} /></Button></div>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28">
              <Panel className="p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Semana de treino</p><div className="mt-4 space-y-2">{workout.splits.map((split, index) => <button key={split.id} onClick={() => setActiveSplit(index)} className={`w-full rounded-xl px-3 py-3 text-left transition ${activeSplit === index ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800'}`}><span className="block text-sm font-extrabold">{split.name}</span><span className={`mt-1 block truncate text-[11px] ${activeSplit === index ? 'text-zinc-800' : 'text-zinc-400'}`}>{split.focus}</span></button>)}</div></Panel>
              <Panel className="p-5"><div className="flex items-center gap-2"><History size={17} className="text-emerald-300" /><h3 className="font-display font-bold">Registros recentes</h3></div><div className="mt-4 max-h-72 space-y-3 overflow-y-auto">{logs.length === 0 ? <p className="text-xs leading-5 text-zinc-400">As séries concluídas aparecerão aqui.</p> : null}{logs.slice(0, 10).map((log) => <div key={log.id} className="rounded-xl bg-zinc-900/70 p-3"><p className="truncate text-xs font-extrabold">{log.exercise}</p><p className="mt-1 text-[11px] font-semibold text-zinc-400">Série {log.setNumber} · {log.weightUsed} kg · {log.repsDone} reps{log.rpe !== null ? ` · RPE ${log.rpe}` : ''}</p></div>)}</div></Panel>
              <div className="rounded-2xl bg-emerald-500/10 p-5"><div className="flex items-center gap-2 text-emerald-200"><Gauge size={18} /><h3 className="font-display font-bold">RIR na prática</h3></div><p className="mt-2 text-xs leading-5 text-emerald-100/70">RIR indica quantas repetições ainda seriam possíveis com boa técnica. RIR 2 significa encerrar a série sentindo que caberiam mais duas.</p></div>
            </aside>
          </div>
        ) : null}
      </div>

      {workout ? <WorkoutPrintSheet workout={workout} profile={prescriptionProfile} /> : null}

      {video && activeVideo ? <div className="screen-only fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Vídeo de ${video.name}`} onMouseDown={(event) => { if (event.currentTarget === event.target) setVideo(null); }}><div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-zinc-900/70 shadow-2xl"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Demonstração</p><h2 className="font-display text-lg font-bold">{video.name}</h2></div><button onClick={() => setVideo(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-white transition hover:bg-red-950/50 hover:text-red-300" aria-label="Fechar vídeo"><X size={20} /></button></div><div className="aspect-video bg-black">{activeVideo.kind === 'video' ? <video src={activeVideo.src} controls autoPlay className="h-full w-full" /> : <iframe src={activeVideo.src} title={`Demonstração de ${video.name}`} className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-presentation" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}</div></div></div> : null}
    </>
  );
}
