'use client';

import { Button, Notice, PageIntro, Panel, StatusBadge } from '@/components/ui';
import { WorkoutEditor } from '@/components/workout-editor';
import { WorkoutPrintSheet } from '@/components/workout-print-sheet';
import { apiFetch } from '@/lib/api';
import { hasRole } from '@/lib/auth';
import { Anamnesis, Workout, User } from '@/types';
import { 
  Activity, 
  AlertTriangle, 
  ArrowLeft, 
  CalendarDays, 
  CheckCircle2, 
  Dumbbell, 
  HeartPulse, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  Target, 
  Trash2, 
  UserRound 
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const experienceLabels = { BEGINNER: 'Iniciante', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' } as const;

type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'subscriptionStatus'>;

export default function AdminStudentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params?.id;
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
    if (!studentId) return;
    setLoading(true);
    try {
      const [anamnesisResponse, workoutsResponse] = await Promise.all([
        apiFetch<{ anamneses: Anamnesis[] }>('/anamnesis'),
        apiFetch<{ workouts: Workout[] }>(`/workouts?userId=${encodeURIComponent(studentId)}`),
      ]);

      const currentAnamnesis = anamnesisResponse.anamneses.find((item) => item.user.id === studentId) ?? null;
      setAnamnesis(currentAnamnesis);
      setWorkouts(workoutsResponse.workouts || []);

      try {
        const usersResponse = await apiFetch<{ users: User[] }>('/users?role=STUDENT');
        const currentStudent = usersResponse.users.find((item) => item.id === studentId) ?? null;
        if (currentStudent) {
          setStudent({
            id: currentStudent.id,
            name: currentStudent.name,
            email: currentStudent.email,
            phone: currentStudent.phone,
            subscriptionStatus: currentStudent.subscriptionStatus,
          });
        } else if (currentAnamnesis) {
          setStudent({
            id: studentId,
            name: currentAnamnesis.user.name,
            email: currentAnamnesis.user.email,
            phone: null,
            subscriptionStatus: currentAnamnesis.user.subscriptionStatus,
          });
        }
      } catch {
        if (currentAnamnesis) {
          setStudent({
            id: studentId,
            name: currentAnamnesis.user.name,
            email: currentAnamnesis.user.email,
            phone: null,
            subscriptionStatus: currentAnamnesis.user.subscriptionStatus,
          });
        }
      }

      setSelectedWorkout((current) => 
        current ? workoutsResponse.workouts.find((item) => item.id === current.id) ?? null : workoutsResponse.workouts[0] ?? null
      );
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível carregar o aluno.' });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!hasRole('ADMIN')) {
      router.replace('/login?next=/admin');
      return;
    }
    void load();
  }, [load, router]);

  async function generate() {
    if (!anamnesis || !student) return;
    setGenerating(true);
    setNotice({ kind: 'info', text: 'Gerando prescrição com nova seleção de estímulos e considerando o quadro clínico...' });

    try {
      const excludeExerciseNames = workouts.flatMap((item) => 
        item.splits.flatMap((split) => split.exercises.map((exercise) => exercise.name))
      );

      const response = await apiFetch<{ workout: Workout; generationMode?: string }>('/workouts/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          anamnesisId: anamnesis.id,
          studentId: student.id,
          userId: student.id,
          excludeExerciseNames,
        }),
      });

      setWorkouts((current) => [response.workout, ...current]);
      setSelectedWorkout(response.workout);
      setNotice({ kind: 'success', text: 'Treino gerado com novas variações de exercícios. Revise e publique.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao gerar o treino.' });
    } finally {
      setGenerating(false);
    }
  }

  async function toggleAccess() {
    if (!student) return;
    const nextStatus = student.subscriptionStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUpdatingAccess(true);

    try {
      const response = await apiFetch<{ user: User }>(`/users/${student.id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setStudent((current) => current ? { ...current, subscriptionStatus: response.user.subscriptionStatus } : current);
      setNotice({ kind: 'success', text: nextStatus === 'ACTIVE' ? 'Acesso do aluno ativado.' : 'Acesso do aluno desativado.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.' });
    } finally {
      setUpdatingAccess(false);
    }
  }

  async function removeWorkout() {
    if (!selectedWorkout || !window.confirm('Excluir este plano e todos os exercícios vinculados?')) return;
    setDeleting(true);

    try {
      await apiFetch(`/workouts/${selectedWorkout.id}`, { method: 'DELETE' });
      setWorkouts((current) => current.filter((item) => item.id !== selectedWorkout.id));
      setSelectedWorkout(null);
      setNotice({ kind: 'success', text: 'Plano excluído com sucesso.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível excluir o plano.' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1480px] px-5 py-10 lg:px-8 lg:py-14">
      <PageIntro
        eyebrow="Gestão individual"
        title={student?.name ?? 'Aluno'}
        description="Consulte o prontuário biomecânico completo, gere variações inéditas e libere a prescrição final."
        action={
          <Button variant="ghost" onClick={() => router.push('/admin')}>
            <ArrowLeft size={17} /> Voltar ao painel
          </Button>
        }
      />

      {notice ? (
        <div className="mb-7">
          <Notice kind={notice.kind}>{notice.text}</Notice>
        </div>
      ) : null}

      {loading ? <Panel className="p-8 text-center text-zinc-400">Carregando prontuário...</Panel> : null}
      {!loading && !student ? <Panel className="p-8 text-center text-zinc-300">Aluno não encontrado.</Panel> : null}

      {student ? (
        <>
          {/* TOPO: Informações de Cadastro e Status */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                  <UserRound />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">{student.name}</h2>
                  <p className="text-sm text-zinc-400">{student.email}</p>
                  <p className="mt-1 text-xs text-zinc-500">{student.phone || 'Telefone não informado'}</p>
                </div>
              </div>
            </Panel>

            <Panel className="p-6">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Status do acesso</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    student.subscriptionStatus === 'ACTIVE'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  {student.subscriptionStatus}
                </span>
                <Button
                  variant={student.subscriptionStatus === 'ACTIVE' ? 'ghost' : 'primary'}
                  loading={updatingAccess}
                  onClick={toggleAccess}
                >
                  {student.subscriptionStatus === 'ACTIVE' ? 'Desativar' : 'Ativar aluno'}
                </Button>
              </div>
            </Panel>
          </div>

          {/* FICHA TÉCNICA E CLÍNICA COMPLETA */}
          <Panel className="mt-6 border-amber-500/30 bg-zinc-950/70 p-6">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <AlertTriangle className="text-amber-400" size={20} />
              <h3 className="font-display text-lg font-bold text-white">
                Prontuário Biomecânico & Clínico do Aluno
              </h3>
            </div>

            {anamnesis ? (
              <div className="mt-4 grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <Target size={14} /> Objetivo & Nível
                  </span>
                  <p className="mt-2 text-sm font-bold text-white">
                    {experienceLabels[anamnesis.experience]} · {anamnesis.weeklyDays}x por semana
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{anamnesis.goal}</p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-400">
                    <ShieldAlert size={14} /> Patologias, Dores & Lesões
                  </span>
                  {anamnesis.injuries && anamnesis.injuries.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {anamnesis.injuries.map((injury, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg border border-red-500/40 bg-red-900/40 px-2.5 py-1 text-xs font-bold text-red-200"
                        >
                          ⚠️ {injury}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">Nenhuma patologia ou restrição informada.</p>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-400">
                    <Dumbbell size={14} /> Estrutura & Equipamentos
                  </span>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                    {anamnesis.availableEquip || 'Academia completa padrão'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">O aluno ainda não enviou os dados da anamnese.</p>
            )}
          </Panel>

          {/* ÁREA DE PLANOS E PRESCRIÇÃO */}
          <div className="mt-7 grid items-start gap-7 xl:grid-cols-[360px_1fr]">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-white">Planos do aluno</h2>
                <span className="text-xs font-bold text-zinc-500">{workouts.length}</span>
              </div>

              <Button
                className="mt-4 w-full"
                loading={generating}
                disabled={!anamnesis}
                onClick={generate}
              >
                <Sparkles size={17} /> Gerar variação inédita
              </Button>

              <div className="mt-5 space-y-2">
                {workouts.length === 0 ? (
                  <p className="rounded-xl bg-zinc-900/70 p-4 text-sm text-zinc-400">Nenhum plano gerado.</p>
                ) : (
                  workouts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedWorkout(item)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                        selectedWorkout?.id === item.id
                          ? 'border-emerald-400 bg-emerald-500 text-zinc-950'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-100 hover:border-emerald-500/40'
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-bold">
                          Plano {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs opacity-70">{item.splits.length} dias</span>
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  ))
                )}
              </div>
            </Panel>

            <Panel className="min-w-0 p-5 md:p-7">
              {selectedWorkout ? (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button variant="danger" loading={deleting} onClick={removeWorkout}>
                      <Trash2 size={16} /> Excluir plano
                    </Button>
                  </div>
                  <WorkoutEditor
                    workout={selectedWorkout}
                    onChange={(updated) => {
                      setSelectedWorkout(updated);
                      setWorkouts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                    }}
                  />
                  <WorkoutPrintSheet
                    workout={selectedWorkout}
                    profile={anamnesis ? { goal: anamnesis.goal, weeklyDays: anamnesis.weeklyDays } : null}
                  />
                </>
              ) : (
                <div className="grid min-h-[500px] place-items-center p-8 text-center text-zinc-400">
                  Selecione ou gere um plano para começar.
                </div>
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </main>
  );
}
