'use client';

import { Button, Notice, PageIntro, Panel } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { getSessionUser, getToken, saveSession } from '@/lib/auth';
import { User } from '@/types';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, FileDown, Flame, ShieldCheck, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type ExtendedUser = User & {
  hasCompletedAnamnesis?: boolean;
};

type Session = { id: string; workoutId: string | null; dayTitle: string; completedAt: string };
type ActiveWorkoutSummary = { workout: { splits: { name: string; focus: string; exercises: { id: string }[] }[] } };

export default function AlunoPage() {
  const router = useRouter();
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSummary['workout'] | null>(null);
  const [accessMessage, setAccessMessage] = useState('');
  const [form, setForm] = useState({ fatigueLevel: 5, jointPainLevel: 0, loadDifficulty: 5, message: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const storedUser = getSessionUser() as ExtendedUser | null;
    const token = getToken();

    if (!storedUser || !token || storedUser.role !== 'STUDENT') {
      router.replace('/login?next=/aluno');
      return;
    }

    apiFetch<{ user: ExtendedUser }>('/auth/me')
      .then(async ({ user: currentUser }) => {
        setUser(currentUser);
        saveSession(token, currentUser);

        // Se ainda não fez a anamnese, redireciona imediatamente
        if (currentUser.hasCompletedAnamnesis === false) {
          router.replace('/anamnese');
          return;
        }

        if (currentUser.subscriptionStatus !== 'ACTIVE') {
          setAccessMessage('Seu cadastro foi recebido e aguarda ativação do personal. As planilhas e treinos serão liberados após a ativação.');
          setChecking(false);
          return;
        }

        setChecking(false);

        const sessionData = await apiFetch<{ sessions: Session[] }>(`/workouts/sessions/${currentUser.id}`);
        setSessions(sessionData.sessions);

        try {
          const activeData = await apiFetch<ActiveWorkoutSummary>(`/student/active-workout/${currentUser.id}`);
          setActiveWorkout(activeData.workout);
        } catch {
          setActiveWorkout(null);
        }
      })
      .catch((error: Error) => {
        setAccessMessage(error.message);
        setChecking(false);
      });
  }, [router]);

  async function sendFeedback() {
    if (!user) return;
    try {
      await apiFetch('/feedbacks', { method: 'POST', body: JSON.stringify({ ...form, userId: user.id }) });
      setMessage('Feedback enviado. Sua equipe já pode acompanhar sua evolução.');
      setForm({ fatigueLevel: 5, jointPainLevel: 0, loadDifficulty: 5, message: '' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar.');
    }
  }

  async function changePassword() {
    setPasswordMessage('');
    if (passwords.newPassword !== passwords.confirmation) {
      setPasswordMessage('A confirmação não coincide com a nova senha.');
      return;
    }
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      setPasswordMessage('Senha alterada com sucesso.');
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' });
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Não foi possível alterar a senha.');
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Validando dados do aluno...
          </p>
        </div>
      </main>
    );
  }

  const active = user?.subscriptionStatus === 'ACTIVE';
  const sessionDays = new Set(sessions.map((session) => new Date(session.completedAt).toISOString().slice(0, 10)));
  const currentStreak = (() => {
    let streak = 0;
    const cursor = new Date();
    while (sessionDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  })();
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <PageIntro
        eyebrow="Área do aluno"
        title={`Olá, ${user?.name ?? 'aluno'}`}
        description="Acompanhe seus treinos, materiais, evolução e segurança da sua conta."
        action={
          <Button variant="dark" onClick={() => router.push('/treino')} disabled={!active}>
            Abrir meus treinos
          </Button>
        }
      />

      {/* BANNER / BOTÃO DE ANAMNESE OBRIGATÓRIA */}
      <Panel className="mb-7 border-emerald-500/40 bg-emerald-950/20 p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-400">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Anamnese do Aluno</h3>
              <p className="text-xs text-zinc-400">
                {user?.hasCompletedAnamnesis
                  ? 'Sua avaliação já foi enviada. Clique caso precise reenviar ou atualizar.'
                  : 'Obrigatório: Preencha seus dados biomecânicos para o personal prescrever seu treino.'}
              </p>
            </div>
          </div>
          <Button onClick={() => router.push('/anamnese')} className="w-full sm:w-auto">
            {user?.hasCompletedAnamnesis ? 'Atualizar Anamnese' : 'Preencher Anamnese Agora →'}
          </Button>
        </div>
      </Panel>

      {accessMessage ? (
        <div className="mb-7">
          <Notice kind={active ? 'error' : 'info'}>{accessMessage}</Notice>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Panel className="p-6">
          <ShieldCheck className={active ? 'text-emerald-300' : 'text-amber-300'} />
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-zinc-400">Status do acesso</p>
          <h2 className={`mt-2 font-display text-2xl font-bold ${active ? 'text-emerald-300' : 'text-amber-300'}`}>
            {user?.subscriptionStatus ?? 'Carregando'}
          </h2>
        </Panel>
        <Panel className="p-6">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Treino personalizado</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">Sua rotina de treino</h2>
          <p className="mt-2 text-sm text-zinc-400">Acesse o plano aprovado e registre cada série.</p>
          <button
            type="button"
            disabled={!active}
            onClick={() => router.push('/treino')}
            className="mt-5 font-bold text-emerald-300 disabled:text-zinc-600"
          >
            Ver treino →
          </button>
        </Panel>
        <Panel className="p-6">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Evolução</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">Check-in periódico</h2>
          <p className="mt-2 text-sm text-zinc-400">Registre dor, fadiga e percepção semanal.</p>
          <button type="button" onClick={() => router.push('/checkin')} className="mt-5 font-bold text-emerald-300">
            Fazer check-in →
          </button>
        </Panel>
      </div>

      {active && activeWorkout ? (
        <Panel className="mt-7 overflow-hidden border-emerald-500/30 bg-emerald-950/20 p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Treino liberado</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">
                {activeWorkout.splits[0]?.name ?? 'Treino personalizado'}
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                {activeWorkout.splits[0]?.focus ?? 'Plano individualizado'} ·{' '}
                {activeWorkout.splits.reduce((total, split) => total + split.exercises.length, 0)} exercícios ·{' '}
                {activeWorkout.splits.length} sessões semanais
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => window.print()}>
                <FileDown size={17} /> PDF oficial
              </Button>
              <Button onClick={() => router.push('/treino')}>
                Abrir Treino de Hoje <ArrowRight size={17} />
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="mt-7 grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Constância semanal</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">Seu calendário de presença</h2>
            </div>
            <CalendarDays className="text-emerald-300" />
          </div>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const key = date.toISOString().slice(0, 10);
              const done = sessionDays.has(key);
              return (
                <div key={key} className="text-center">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">
                    {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                  </p>
                  <div
                    className={`mx-auto mt-2 grid h-11 w-11 place-items-center rounded-2xl border ${
                      done
                        ? 'border-emerald-400 bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    <span className="text-sm font-black">{date.getDate()}</span>
                  </div>
                  {done ? <CheckCircle2 size={13} className="mx-auto mt-1 text-emerald-300" /> : <span className="mt-1 block h-3" />}
                </div>
              );
            })}
          </div>
          <div className="mt-6 space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5"
              >
                <span className="text-sm font-bold text-zinc-200">{session.dayTitle}</span>
                <span className="text-xs text-zinc-500">{new Date(session.completedAt).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
            {sessions.length === 0 ? (
              <p className="text-sm text-zinc-400">Conclua seu primeiro treino para iniciar o calendário.</p>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-6">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Gamificação</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">Evolução de presença</h2>
          <div className="mt-6 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-950/20 p-4">
              <Flame className="text-orange-300" />
              <div>
                <p className="text-xs font-bold text-zinc-400">Sequência atual</p>
                <p className="text-2xl font-black text-white">
                  {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <Trophy className="text-emerald-300" />
              <div>
                <p className="text-xs font-bold text-zinc-400">Treinos concluídos</p>
                <p className="text-2xl font-black text-white">{sessions.length}</p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-400">
            Cada treino concluído fortalece sua constância. Mantenha a sequência e acompanhe sua evolução semanal.
          </p>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-display text-2xl font-bold text-white">Feedback da semana</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {(
              [
                ['fatigueLevel', 'Cansaço'],
                ['jointPainLevel', 'Dores'],
                ['loadDifficulty', 'Dificuldade'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="text-sm font-bold text-zinc-300">
                {label}
                <input
                  className="mt-2 w-full accent-emerald-400"
                  type="range"
                  min={field === 'jointPainLevel' ? 0 : 1}
                  max="10"
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: Number(event.target.value) })}
                />
                <span className="text-emerald-300">{form[field]}/10</span>
              </label>
            ))}
          </div>
          <textarea
            className="field-control mt-5 min-h-24"
            placeholder="Conte como foi sua semana..."
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
          />
          {message ? (
            <div className="mt-4">
              <Notice kind={message.startsWith('Feedback') ? 'success' : 'error'}>{message}</Notice>
            </div>
          ) : null}
          <Button className="mt-4" onClick={sendFeedback}>
            Enviar feedback
          </Button>
        </Panel>
      </div>

      <Panel className="mt-7 max-w-2xl p-6">
        <h2 className="font-display text-2xl font-bold text-white">Segurança da conta</h2>
        <p className="mt-2 text-sm text-zinc-400">Troque sua senha sempre que desejar.</p>
        <div className="mt-5 grid gap-3">
          <input
            className="field-control"
            type="password"
            placeholder="Senha atual"
            value={passwords.currentPassword}
            onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
          />
          <input
            className="field-control"
            type="password"
            minLength={8}
            placeholder="Nova senha (mínimo 8 caracteres)"
            value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
          />
          <input
            className="field-control"
            type="password"
            minLength={8}
            placeholder="Confirme a nova senha"
            value={passwords.confirmation}
            onChange={(event) => setPasswords({ ...passwords, confirmation: event.target.value })}
          />
          {passwordMessage ? (
            <Notice kind={passwordMessage.includes('sucesso') ? 'success' : 'error'}>{passwordMessage}</Notice>
          ) : null}
          <Button onClick={changePassword}>Alterar senha</Button>
        </div>
      </Panel>
    </main>
  );
}
