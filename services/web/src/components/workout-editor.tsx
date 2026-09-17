'use client';

import { Button, Notice, StatusBadge } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { Exercise, Workout } from '@/types';
import { CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type EditableExercise = Omit<Exercise, 'id' | 'order'> & { id?: string; order?: number };
type EditableSplit = {
  id?: string;
  name: string;
  focus: string;
  order?: number;
  exercises: EditableExercise[];
};
type EditableWorkout = Omit<Workout, 'splits'> & { splits: EditableSplit[] };

function emptyExercise(): EditableExercise {
  return { name: 'Novo exercício', sets: 3, reps: '8-12', rir: 2, restSeconds: 90, cadence: '3-0-1-0', notes: '', videoUrl: null, lastLog: null };
}

export function WorkoutEditor({ workout, onChange }: { workout: Workout; onChange: (workout: Workout) => void }) {
  const [draft, setDraft] = useState<EditableWorkout>(workout);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => setDraft(workout), [workout]);

  function updateSplit(index: number, key: 'name' | 'focus', value: string) {
    setDraft((current) => ({ ...current, splits: current.splits.map((split, i) => (i === index ? { ...split, [key]: value } : split)) }));
  }

  function updateExercise(splitIndex: number, exerciseIndex: number, key: keyof EditableExercise, value: string | number | null) {
    setDraft((current) => ({
      ...current,
      splits: current.splits.map((split, i) => i === splitIndex ? {
        ...split,
        exercises: split.exercises.map((exercise, j) => j === exerciseIndex ? { ...exercise, [key]: value } : exercise),
      } : split),
    }));
  }

  function addExercise(splitIndex: number) {
    setDraft((current) => ({ ...current, splits: current.splits.map((split, index) => index === splitIndex ? { ...split, exercises: [...split.exercises, emptyExercise()] } : split) }));
  }

  function removeExercise(splitIndex: number, exerciseIndex: number) {
    setDraft((current) => ({ ...current, splits: current.splits.map((split, index) => index === splitIndex ? { ...split, exercises: split.exercises.filter((_, i) => i !== exerciseIndex) } : split) }));
  }

  function addSplit() {
    setDraft((current) => ({ ...current, splits: [...current.splits, { name: `Treino ${String.fromCharCode(65 + current.splits.length)}`, focus: 'Novo foco', exercises: [emptyExercise(), emptyExercise()] }] }));
  }

  function removeSplit(splitIndex: number) {
    setDraft((current) => ({ ...current, splits: current.splits.filter((_, index) => index !== splitIndex) }));
  }

  function payload() {
    return {
      rationale: draft.rationale,
      splits: draft.splits.map((split) => ({
        name: split.name,
        focus: split.focus,
        exercises: split.exercises.map((exercise) => ({
          name: exercise.name,
          sets: Number(exercise.sets),
          reps: exercise.reps,
          rir: Number(exercise.rir),
          restSeconds: Number(exercise.restSeconds),
          ...(exercise.cadence?.trim() ? { cadence: exercise.cadence.trim() } : {}),
          ...(exercise.notes?.trim() ? { notes: exercise.notes.trim() } : {}),
          ...(exercise.videoUrl?.trim() ? { videoUrl: exercise.videoUrl.trim() } : {}),
        })),
      })),
    };
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await apiFetch<{ workout: Workout }>(`/workouts/${workout.id}`, { method: 'PUT', body: JSON.stringify(payload()) });
      onChange(response.workout);
      setMessage({ kind: 'success', text: 'Alterações salvas no rascunho.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar o treino.' });
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setApproving(true);
    setMessage(null);
    try {
      const saved = await apiFetch<{ workout: Workout }>(`/workouts/${workout.id}`, { method: 'PUT', body: JSON.stringify(payload()) });
      const approved = await apiFetch<{ workout: Workout }>(`/workouts/${workout.id}/approve`, { method: 'PATCH' });
      onChange({ ...saved.workout, ...approved.workout });
      setMessage({ kind: 'success', text: 'Treino aprovado e liberado para o aluno.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao aprovar o treino.' });
    } finally {
      setApproving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-zinc-800/10 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3"><StatusBadge status={workout.status} /><span className="text-xs font-bold text-zinc/40">Criado em {new Date(workout.createdAt).toLocaleDateString('pt-BR')}</span></div>
          <h2 className="mt-3 font-display text-2xl font-bold">Plano de {workout.user?.name ?? 'aluno'}</h2>
        </div>
        {workout.status === 'DRAFT' ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" loading={saving} onClick={save}><Save size={17} /> Salvar rascunho</Button>
            <Button loading={approving} onClick={approve}><CheckCircle2 size={17} /> Aprovar treino</Button>
          </div>
        ) : null}
      </div>

      {message ? <div className="mb-5"><Notice kind={message.kind}>{message.text}</Notice></div> : null}

      <label className="block">
        <span className="field-label">Racional técnico</span>
        <textarea value={draft.rationale} disabled={workout.status !== 'DRAFT'} onChange={(event) => setDraft({ ...draft, rationale: event.target.value })} className="field-control min-h-28 resize-y disabled:bg-zinc-900/60" />
      </label>

      <div className="mt-7 space-y-5">
        {draft.splits.map((split, splitIndex) => (
          <section key={split.id ?? `new-${splitIndex}`} className="overflow-hidden rounded-2xl border border-zinc-800/10 bg-[#fbfcf9]">
            <div className="flex flex-col gap-3 border-b border-zinc-800/10 bg-zinc-900/70 p-4 md:flex-row md:items-center">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-zinc-800 text-xs font-black text-lime-300">{String(splitIndex + 1).padStart(2, '0')}</span>
              <input value={split.name} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateSplit(splitIndex, 'name', event.target.value)} className="min-w-32 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-display text-lg font-bold focus:border-lime-500 disabled:opacity-80" />
              <input value={split.focus} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateSplit(splitIndex, 'focus', event.target.value)} className="min-w-52 flex-[2] rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-zinc/55 focus:border-lime-500 disabled:opacity-80" />
              {workout.status === 'DRAFT' && draft.splits.length > 1 ? <button onClick={() => removeSplit(splitIndex)} className="rounded-lg p-2 text-red-500 transition hover:bg-red-50" title="Excluir divisão"><Trash2 size={17} /></button> : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-zinc-800/10 bg-[#111622] text-[10px] uppercase tracking-wider text-zinc/40">
                  <tr><th className="px-4 py-3">Exercício</th><th className="px-2 py-3">Séries</th><th className="px-2 py-3">Reps</th><th className="px-2 py-3">RIR</th><th className="px-2 py-3">Descanso</th><th className="px-2 py-3">Cadência</th><th className="px-2 py-3">Vídeo / GIF</th><th className="px-2 py-3">Observação</th><th className="w-10" /></tr>
                </thead>
                <tbody>
                  {split.exercises.map((exercise, exerciseIndex) => (
                    <tr key={exercise.id ?? `new-${exerciseIndex}`} className="border-b border-zinc-800/5 bg-[#111622] align-top last:border-0">
                      <td className="p-2 pl-4"><input className="w-48 rounded-lg border border-zinc-800/10 px-2 py-2 font-bold disabled:border-transparent disabled:bg-transparent" value={exercise.name} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'name', event.target.value)} /></td>
                      <td className="p-2"><input type="number" min="1" max="10" className="w-16 rounded-lg border border-zinc-800/10 px-2 py-2 disabled:border-transparent disabled:bg-transparent" value={exercise.sets} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'sets', Number(event.target.value))} /></td>
                      <td className="p-2"><input className="w-24 rounded-lg border border-zinc-800/10 px-2 py-2 disabled:border-transparent disabled:bg-transparent" value={exercise.reps} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'reps', event.target.value)} /></td>
                      <td className="p-2"><input type="number" min="0" max="5" className="w-16 rounded-lg border border-zinc-800/10 px-2 py-2 disabled:border-transparent disabled:bg-transparent" value={exercise.rir} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'rir', Number(event.target.value))} /></td>
                      <td className="p-2"><input type="number" min="15" max="600" className="w-20 rounded-lg border border-zinc-800/10 px-2 py-2 disabled:border-transparent disabled:bg-transparent" value={exercise.restSeconds} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'restSeconds', Number(event.target.value))} /></td>
                      <td className="p-2"><input className="w-24 rounded-lg border border-zinc-800/10 px-2 py-2 disabled:border-transparent disabled:bg-transparent" value={exercise.cadence ?? ''} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'cadence', event.target.value)} /></td>
                      <td className="p-2"><input type="url" className="w-52 rounded-lg border border-zinc-800/10 px-2 py-2 text-xs disabled:border-transparent disabled:bg-transparent" value={exercise.videoUrl ?? ''} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'videoUrl', event.target.value)} placeholder="https://..." /></td>
                      <td className="p-2"><textarea className="min-h-10 w-56 resize-y rounded-lg border border-zinc-800/10 px-2 py-2 text-xs disabled:border-transparent disabled:bg-transparent" value={exercise.notes ?? ''} disabled={workout.status !== 'DRAFT'} onChange={(event) => updateExercise(splitIndex, exerciseIndex, 'notes', event.target.value)} /></td>
                      <td className="p-2">{workout.status === 'DRAFT' && split.exercises.length > 2 ? <button onClick={() => removeExercise(splitIndex, exerciseIndex)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {workout.status === 'DRAFT' ? <button onClick={() => addExercise(splitIndex)} className="flex w-full items-center justify-center gap-2 border-t border-dashed border-zinc-800/15 bg-[#111622] py-3 text-xs font-extrabold text-emerald-400 hover:bg-lime-50"><Plus size={15} /> Adicionar exercício</button> : null}
          </section>
        ))}
      </div>
      {workout.status === 'DRAFT' ? <Button variant="ghost" onClick={addSplit} className="mt-5 w-full border-dashed"><Plus size={17} /> Adicionar divisão de treino</Button> : null}
    </div>
  );
}
