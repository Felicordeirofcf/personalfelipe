'use client';

import { Button, Notice, PageIntro, Panel, StatusBadge } from '@/components/ui';
import { WorkoutEditor } from '@/components/workout-editor';
import { WorkoutPrintSheet } from '@/components/workout-print-sheet';
import { apiFetch } from '@/lib/api';
import { hasRole } from '@/lib/auth';
import { Anamnesis, Workout, User } from '@/types';
import { ArrowLeft, CheckCircle2, RefreshCw, Sparkles, Trash2, UserRound } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const experienceLabels = { BEGINNER: 'Iniciante', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' } as const;

type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'subscriptionStatus'>;

export default function AdminStudentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [student, setStudent] = useState<UserSummary | null>(null);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [anamnesisResponse, workoutsResponse, usersResponse] = await Promise.all([
        apiFetch<{ anamneses: Anamnesis[] }>('/anamnesis'),
        apiFetch<{ workouts: Workout[] }>(`/workouts?userId=${encodeURIComponent(studentId)}`),
        apiFetch<{ users: User[] }>('/users?role=STUDENT'),
      ]);
      const currentAnamnesis = anamnesisResponse.anamneses.find((item) => item.user.id === studentId) ?? null;
      const currentStudent = usersResponse.users.find((item) => item.id === studentId) ?? null;
      setAnamnesis(currentAnamnesis);
      setStudent(currentStudent ? { id: currentStudent.id, name: currentStudent.name, email: currentStudent.email, phone: currentStudent.phone, subscriptionStatus: currentStudent.subscriptionStatus } : currentAnamnesis ? { id: studentId, name: currentAnamnesis.user.name, email: currentAnamnesis.user.email, phone: null, subscriptionStatus: currentAnamnesis.user.subscriptionStatus } : null);
      setWorkouts(workoutsResponse.workouts);
      setSelectedWorkout((current) => current ? workoutsResponse.workouts.find((item) => item.id === current.id) ?? null : workoutsResponse.workouts[0] ?? null);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível carregar o aluno.' });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!hasRole('ADMIN')) { router.replace('/login?next=/admin'); return; }
    void load();
  }, [load, router]);

  async function generate() {
    if (!anamnesis) return;
    setGenerating(true);
    setNotice({ kind: 'info', text: 'Gerando uma nova variação do treino para este aluno...' });
    try {
      const response = await apiFetch<{ workout: Workout }>('/workouts/generate', { method: 'POST', body: JSON.stringify({ anamnesisId: anamnesis.id }) });
      setWorkouts((current) => [response.workout, ...current]);
      setSelectedWorkout(response.workout);
      setNotice({ kind: 'success', text: 'Novo treino gerado. Revise e edite antes de liberar.' });
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao gerar o treino.' }); }
    finally { setGenerating(false); }
  }

  async function toggleAccess() {
    if (!student) return;
    const status = student.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUpdatingAccess(true);
    try {
      const response = await apiFetch<{ user: User }>(`/users/${student.id}/subscription`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setStudent((current) => current ? { ...current, subscriptionStatus: response.user.subscriptionStatus } : current);
      setNotice({ kind: 'success', text: status === 'ACTIVE' ? 'Acesso do aluno ativado.' : 'Acesso do aluno desativado.' });
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.' }); }
    finally { setUpdatingAccess(false); }
  }

  async function removeWorkout() {
    if (!selectedWorkout || !window.confirm('Excluir este plano e todos os exercícios vinculados?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/workouts/${selectedWorkout.id}`, { method: 'DELETE' });
      setWorkouts((current) => current.filter((item) => item.id !== selectedWorkout.id));
      setSelectedWorkout(null);
      setNotice({ kind: 'success', text: 'Plano excluído com sucesso.' });
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível excluir o plano.' }); }
    finally { setDeleting(false); }
  }

  return (
    <main className="mx-auto max-w-[1480px] px-5 py-10 lg:px-8 lg:py-14">
      <PageIntro eyebrow="Gestão individual" title={student?.name ?? 'Aluno'} description="Revise a Anamnese, gere variações, edite a prescrição, ative o acesso e libere somente o plano finalizado." action={<Button variant="ghost" onClick={() => router.push('/admin')}><ArrowLeft size={17} /> Voltar ao painel</Button>} />
      {notice ? <div className="mb-7"><Notice kind={notice.kind}>{notice.text}</Notice></div> : null}
      {loading ? <Panel className="p-8 text-center text-zinc-400">Carregando prontuário...</Panel> : null}
      {!loading && !student ? <Panel className="p-8 text-center text-zinc-300">Aluno não encontrado.</Panel> : null}
      {student ? <>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
          <Panel className="p-6"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300"><UserRound /></span><div><h2 className="font-display text-xl font-bold text-white">{student.name}</h2><p className="text-sm text-zinc-400">{student.email}</p><p className="mt-1 text-xs text-zinc-500">{student.phone || 'Telefone não informado'}</p></div></div></Panel>
          <Panel className="p-6"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Status do acesso</p><div className="mt-3 flex items-center justify-between gap-3"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${student.subscriptionStatus === 'ACTIVE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>{student.subscriptionStatus}</span><Button variant={student.subscriptionStatus === 'ACTIVE' ? 'ghost' : 'primary'} loading={updatingAccess} onClick={toggleAccess}>{student.subscriptionStatus === 'ACTIVE' ? 'Desativar' : 'Ativar aluno'}</Button></div></Panel>
          <Panel className="p-6"><p className="text-xs font-black uppercase tracking-wider text-zinc-500">Anamnese</p>{anamnesis ? <><p className="mt-2 text-sm font-bold text-white">{experienceLabels[anamnesis.experience]} · {anamnesis.weeklyDays}x/semana</p><p className="mt-1 line-clamp-2 text-xs text-zinc-400">{anamnesis.goal}</p></> : <p className="mt-2 text-sm text-zinc-400">Sem anamnese cadastrada.</p>}</Panel>
        </div>

        <div className="mt-7 grid items-start gap-7 xl:grid-cols-[360px_1fr]">
          <Panel className="p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-white">Planos do aluno</h2><span className="text-xs font-bold text-zinc-500">{workouts.length}</span></div><Button className="mt-4 w-full" loading={generating} disabled={!anamnesis} onClick={generate}><Sparkles size={17} /> Gerar novamente</Button><div className="mt-5 space-y-2">{workouts.length === 0 ? <p className="rounded-xl bg-zinc-900/70 p-4 text-sm text-zinc-400">Nenhum plano gerado.</p> : workouts.map((item) => <button key={item.id} type="button" onClick={() => setSelectedWorkout(item)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${selectedWorkout?.id === item.id ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-900/60 text-zinc-100 hover:border-emerald-500/40'}`}><span><span className="block text-sm font-bold">Plano {new Date(item.createdAt).toLocaleDateString('pt-BR')}</span><span className="text-xs opacity-70">{item.splits.length} dias</span></span><StatusBadge status={item.status} /></button>)}</div></Panel>
          <Panel className="min-w-0 p-5 md:p-7">{selectedWorkout ? <><div className="mb-4 flex justify-end"><Button variant="danger" loading={deleting} onClick={removeWorkout}><Trash2 size={16} /> Excluir plano</Button></div><WorkoutEditor workout={selectedWorkout} onChange={(updated) => { setSelectedWorkout(updated); setWorkouts((current) => current.map((item) => item.id === updated.id ? updated : item)); }} /><WorkoutPrintSheet workout={selectedWorkout} profile={anamnesis ? { goal: anamnesis.goal, weeklyDays: anamnesis.weeklyDays } : null} /></> : <div className="grid min-h-[500px] place-items-center p-8 text-center text-zinc-400">Selecione ou gere um plano para começar.</div>}</Panel>
        </div>
      </> : null}
    </main>
  );
}
