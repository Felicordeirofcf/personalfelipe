'use client';

import { Button, Notice, Panel } from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

function formatCpf(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')     .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', cpf: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const cleanCpf = form.cpf.replace(/\D/g, '');
      const cleanEmail = form.email.trim().toLowerCase();
      const cleanName = form.name.trim();

      // 1. Cria a conta do aluno com CPF limpo
      const response = await apiFetch<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: form.password,
          cpf: cleanCpf,
        }),
      });

      saveSession(response.token, response.user);

      // 2. Dispara a criação da preferência no Mercado Pago (R$ 40,00)
      const checkout = await apiFetch<{ initPoint: string }>('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          userId: response.user?.id || response.user?.userId,
          email: cleanEmail,
          name: cleanName,
        }),
      });

      // 3. Redirecionamento obrigatório para o gateway seguro
      if (checkout?.initPoint) {
        window.location.href = checkout.initPoint;
      } else {
        throw new Error('Link de pagamento não gerado pelo Mercado Pago. Tente novamente em instantes.');
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setError('Este e-mail já possui conta no sistema. Redirecionando para o login...');
        window.setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(form.email.trim())}`);
        }, 1500);
      } else {
        setError(reason instanceof Error ? reason.message : 'Não foi possível concluir seu cadastro.');
        setLoading(false);
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Panel className="p-7 md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
          Comece agora
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold">Crie sua conta</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Seu acesso inclui treino interativo, vídeos de execução, periodizações avançadas e ficha em PDF.
        </p>

        <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
            Pagamento único
          </p>
          <p className="mt-1 text-2xl font-black text-white">R$ 40,00</p>
          <p className="text-sm text-zinc-400">
            Taxa única por elaboração da planilha personalizada.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="field-label">Nome completo</span>
            <input
              className="field-control"
              required
              minLength={3}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="field-label">E-mail</span>
            <input
              className="field-control"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="field-label">CPF</span>
            <input
              className="field-control"
              required
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
            />
          </label>

          <label className="block">
            <span className="field-label">Senha</span>
            <input
              className="field-control"
              type="password"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          {error ? <Notice kind="error">{error}</Notice> : null}

          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Redirecionando para pagamento seguro...' : 'Criar conta e pagar R$ 40,00'}
          </Button>

          <p className="text-center text-sm text-zinc-400">
            Já possui conta?{' '}
            <a className="font-bold text-emerald-400" href="/login">
              Entrar
            </a>
          </p>
        </form>
      </Panel>
    </main>
  );
}
