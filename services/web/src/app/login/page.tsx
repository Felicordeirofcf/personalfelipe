'use client';

import { apiFetch } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { User } from '@/types';
import { Activity, ArrowRight, LockKeyhole, UserRound } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/treino';
  const [students, setStudents] = useState<User[]>([]);
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiFetch<{ users: User[] }>('/users?role=STUDENT'), apiFetch<{ users: User[] }>('/users?role=ADMIN')])
      .then(([studentData, adminData]) => { setStudents(studentData.users); setAdmin(adminData.users[0] ?? null); })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  async function login(user: User) {
    setError('');
    try {
      const response = await apiFetch<{ token: string; user: Omit<User, 'subscriptionStatus'> }>('/auth/demo-login', { method: 'POST', body: JSON.stringify({ userId: user.id }) });
      saveSession(response.token, { ...user, ...response.user });
      router.push(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.'); }
  }

  return <div className="grid min-h-[calc(100vh-90px)] place-items-center px-5 py-12"><div className="w-full max-w-lg rounded-[2rem] border border-ink/10 bg-white p-7 shadow-soft md:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-lime-300"><Activity size={26} /></div><div className="mt-6 text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-lime-700">Acesso seguro</p><h1 className="mt-2 font-display text-3xl font-bold">Entrar na sua área</h1><p className="mt-3 text-sm leading-6 text-ink/55">Use seu acesso para acompanhar o plano e registrar sua evolução.</p></div>{error ? <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}<div className="mt-8 space-y-3">{students.map((student) => <button key={student.id} onClick={() => login(student)} disabled={loading} className="flex w-full items-center gap-4 rounded-2xl border border-ink/10 bg-[#f8faf6] p-4 text-left transition hover:-translate-y-0.5 hover:border-lime-500/50"><span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-lime-700"><UserRound size={20} /></span><span className="min-w-0 flex-1"><strong className="block font-display">{student.name}</strong><span className="text-xs font-semibold text-ink/45">Área do aluno · {student.email}</span></span><ArrowRight size={18} className="text-ink/35" /></button>)}{admin ? <button onClick={() => login(admin)} disabled={loading} className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-ink/20 p-4 text-left transition hover:border-ink/50"><span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-lime-300"><LockKeyhole size={19} /></span><span className="min-w-0 flex-1"><strong className="block font-display">Acesso administrativo</strong><span className="text-xs font-semibold text-ink/45">Rota privada do Personal Trainer</span></span><ArrowRight size={18} className="text-ink/35" /></button> : null}</div><p className="mt-7 text-center text-[11px] font-semibold leading-5 text-ink/40">Ambiente de demonstração local. Em produção, substitua por autenticação real e credenciais individuais.</p></div></div>;
}

export default function LoginPage() {
  return <Suspense fallback={<div className="grid min-h-[calc(100vh-90px)] place-items-center text-sm font-bold text-ink/45">Carregando acesso...</div>}><LoginContent /></Suspense>;
}
