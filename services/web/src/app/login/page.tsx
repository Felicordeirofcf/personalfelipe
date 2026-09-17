'use client';

import { Button, Notice, Panel } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';

function LoginForm() {
  const router = useRouter(); const params = useSearchParams();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setLoading(true); try { const response = await apiFetch<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); saveSession(response.token, response.user); router.push(params.get('next') || (response.user.role === 'ADMIN' ? '/admin' : '/treino')); } catch (reason) { setError(reason instanceof Error ? reason.message : 'E-mail ou senha inválidos.'); } finally { setLoading(false); } }
  return <main className="mx-auto max-w-lg px-5 py-16"><Panel className="p-7 md:p-10"><p className="text-xs font-black uppercase tracking-[0.2em] text-lime-700">Acesso à plataforma</p><h1 className="mt-2 font-display text-4xl font-bold">Bem-vindo de volta</h1><p className="mt-3 text-sm text-ink/55">Entre para acessar seu acompanhamento personalizado.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block"><span className="field-label">E-mail</span><input className="field-control" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block"><span className="field-label">Senha</span><input className="field-control" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error ? <Notice kind="error">{error}</Notice> : null}<Button type="submit" loading={loading} className="w-full">Entrar</Button><p className="text-center text-sm text-ink/50">Ainda não tem conta? <a className="font-bold text-lime-700" href="/cadastro">Criar cadastro</a></p></form></Panel></main>;
}
export default function LoginPage() { return <Suspense fallback={<main className="p-12 text-center">Carregando...</main>}><LoginForm /></Suspense>; }
