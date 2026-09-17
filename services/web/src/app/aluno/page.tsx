'use client';

import { Button, Notice, PageIntro, Panel } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { getSessionUser, getToken, saveSession } from '@/lib/auth';
import { User } from '@/types';
import { ArrowRight, FileDown, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Spreadsheet = { id: string; title: string; fileUrl: string | null; externalUrl: string | null; createdAt: string };
type ActiveWorkoutSummary = { workout: { splits: { name: string; focus: string; exercises: { id: string }[] }[] } };

export default function AlunoPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sheets, setSheets] = useState<Spreadsheet[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutSummary['workout'] | null>(null);
  const [accessMessage, setAccessMessage] = useState('');
  const [form, setForm] = useState({ fatigueLevel: 5, jointPainLevel: 0, loadDifficulty: 5, message: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const storedUser = getSessionUser();
    const token = getToken();
    if (!storedUser || !token || storedUser.role !== 'STUDENT') { router.replace('/login?next=/aluno'); return; }

    apiFetch<{ user: User }>('/auth/me')
      .then(async ({ user: currentUser }) => {
        setUser(currentUser);
        saveSession(token, currentUser);
        if (currentUser.subscriptionStatus !== 'ACTIVE') {
          setAccessMessage('Seu cadastro foi recebido e aguarda ativação do personal. As planilhas e treinos serão liberados após a ativação.');
          return;
        }
        const data = await apiFetch<{ spreadsheets: Spreadsheet[] }>(`/spreadsheets/${currentUser.id}`);
        setSheets(data.spreadsheets);
        try { const activeData = await apiFetch<ActiveWorkoutSummary>(`/student/active-workout/${currentUser.id}`); setActiveWorkout(activeData.workout); } catch { setActiveWorkout(null); }
      })
      .catch((error: Error) => setAccessMessage(error.message));
  }, [router]);

  async function sendFeedback() {
    if (!user) return;
    try {
      await apiFetch('/feedbacks', { method: 'POST', body: JSON.stringify({ ...form, userId: user.id }) });
      setMessage('Feedback enviado. Sua equipe já pode acompanhar sua evolução.');
      setForm({ fatigueLevel: 5, jointPainLevel: 0, loadDifficulty: 5, message: '' });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar.'); }
  }

  async function changePassword() {
    setPasswordMessage('');
    if (passwords.newPassword !== passwords.confirmation) { setPasswordMessage('A confirmação não coincide com a nova senha.'); return; }
    try {
      await apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }) });
      setPasswordMessage('Senha alterada com sucesso.');
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' });
    } catch (error) { setPasswordMessage(error instanceof Error ? error.message : 'Não foi possível alterar a senha.'); }
  }

  const active = user?.subscriptionStatus === 'ACTIVE';

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <PageIntro eyebrow="Área do aluno" title={`Olá, ${user?.name ?? 'aluno'}`} description="Acompanhe seus treinos, materiais, evolução e segurança da sua conta." action={<Button variant="dark" onClick={() => router.push('/treino')} disabled={!active}>Abrir meus treinos</Button>} />

      {accessMessage ? <div className="mb-7"><Notice kind={active ? 'error' : 'info'}>{accessMessage}</Notice></div> : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Panel className="p-6"><ShieldCheck className={active ? 'text-emerald-300' : 'text-amber-300'} /><p className="mt-4 text-xs font-black uppercase tracking-wider text-zinc-400">Status do acesso</p><h2 className={`mt-2 font-display text-2xl font-bold ${active ? 'text-emerald-300' : 'text-amber-300'}`}>{user?.subscriptionStatus ?? 'Carregando'}</h2></Panel>
        <Panel className="p-6"><p className="text-xs font-black uppercase tracking-wider text-emerald-300">Treino personalizado</p><h2 className="mt-2 font-display text-2xl font-bold text-white">Sua rotina de treino</h2><p className="mt-2 text-sm text-zinc-400">Acesse o plano aprovado e registre cada série.</p><button type="button" disabled={!active} onClick={() => router.push('/treino')} className="mt-5 font-bold text-emerald-300 disabled:text-zinc-600">Ver treino →</button></Panel>
        <Panel className="p-6"><p className="text-xs font-black uppercase tracking-wider text-emerald-300">Evolução</p><h2 className="mt-2 font-display text-2xl font-bold text-white">Check-in periódico</h2><p className="mt-2 text-sm text-zinc-400">Registre dor, fadiga e percepção semanal.</p><button type="button" onClick={() => router.push('/checkin')} className="mt-5 font-bold text-emerald-300">Fazer check-in →</button></Panel>
      </div>

      {active && activeWorkout ? <Panel className="mt-7 overflow-hidden border-emerald-500/30 bg-emerald-950/20 p-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-300">Treino liberado</p><h2 className="mt-2 font-display text-2xl font-bold text-white">{activeWorkout.splits[0]?.name ?? 'Treino personalizado'}</h2><p className="mt-2 text-sm text-zinc-300">{activeWorkout.splits[0]?.focus ?? 'Plano individualizado'} · {activeWorkout.splits.reduce((total, split) => total + split.exercises.length, 0)} exercícios · {activeWorkout.splits.length} sessões semanais</p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => window.print()}><FileDown size={17} /> PDF oficial</Button><Button onClick={() => router.push('/treino')}>Abrir Treino de Hoje <ArrowRight size={17} /></Button></div></div></Panel> : null}

      <div className="mt-7 grid gap-7 lg:grid-cols-2">
        <Panel className="p-6"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-white">Minhas planilhas</h2>{active ? <FileDown className="text-emerald-300" /> : <LockKeyhole className="text-amber-300" />}</div><div className="mt-5 space-y-3">{!active ? <p className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm text-amber-200">Conteúdo disponível após a ativação do acesso.</p> : sheets.length === 0 ? <p className="text-sm text-zinc-400">Seu treino publicado aparece no card acima. Outros materiais serão exibidos aqui quando forem vinculados.</p> : sheets.map((sheet) => <div key={sheet.id} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><span className="font-bold text-zinc-100">{sheet.title}</span><a className="shrink-0 font-bold text-emerald-300 hover:text-emerald-200" href={sheet.fileUrl || sheet.externalUrl || '#'} target="_blank" rel="noopener noreferrer">Abrir / baixar</a></div>)}</div></Panel>

        <Panel className="p-6"><h2 className="font-display text-2xl font-bold text-white">Feedback da semana</h2><div className="mt-5 grid gap-4 sm:grid-cols-3">{([['fatigueLevel', 'Cansaço'], ['jointPainLevel', 'Dores'], ['loadDifficulty', 'Dificuldade']] as const).map(([field, label]) => <label key={field} className="text-sm font-bold text-zinc-300">{label}<input className="mt-2 w-full accent-emerald-400" type="range" min={field === 'jointPainLevel' ? 0 : 1} max="10" value={form[field]} onChange={(event) => setForm({ ...form, [field]: Number(event.target.value) })} /><span className="text-emerald-300">{form[field]}/10</span></label>)}</div><textarea className="field-control mt-5 min-h-24" placeholder="Conte como foi sua semana..." value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />{message ? <div className="mt-4"><Notice kind={message.startsWith('Feedback') ? 'success' : 'error'}>{message}</Notice></div> : null}<Button className="mt-4" onClick={sendFeedback}>Enviar feedback</Button></Panel>
      </div>

      <Panel className="mt-7 max-w-2xl p-6"><h2 className="font-display text-2xl font-bold text-white">Segurança da conta</h2><p className="mt-2 text-sm text-zinc-400">Troque sua senha sempre que desejar.</p><div className="mt-5 grid gap-3"><input className="field-control" type="password" placeholder="Senha atual" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /><input className="field-control" type="password" minLength={8} placeholder="Nova senha (mínimo 8 caracteres)" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /><input className="field-control" type="password" minLength={8} placeholder="Confirme a nova senha" value={passwords.confirmation} onChange={(event) => setPasswords({ ...passwords, confirmation: event.target.value })} />{passwordMessage ? <Notice kind={passwordMessage.includes('sucesso') ? 'success' : 'error'}>{passwordMessage}</Notice> : null}<Button onClick={changePassword}>Alterar senha</Button></div></Panel>
    </main>
  );
}
