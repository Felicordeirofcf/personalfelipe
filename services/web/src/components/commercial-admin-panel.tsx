'use client';

import { Button, Panel } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { SubscriptionStatus, User } from '@/types';
import { useEffect, useState } from 'react';

type FeedbackItem = {
  id: string;
  fatigueLevel: number;
  jointPainLevel: number;
  message: string | null;
  user: { name: string };
};

export function CommercialAdminPanel() {
  const [students, setStudents] = useState<User[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('Planilha oficial');
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  async function load() {
    const [users, feedback] = await Promise.all([
      apiFetch<{ users: User[] }>('/users?role=STUDENT'),
      apiFetch<{ feedbacks: FeedbackItem[] }>('/feedbacks'),
    ]);
    setStudents(users.users);
    setFeedbacks(feedback.feedbacks);
  }

  useEffect(() => {
    void load().catch(() => setNotice('Não foi possível carregar a gestão de alunos.'));
  }, []);

  async function changeSubscription(student: User, status: Extract<SubscriptionStatus, 'ACTIVE' | 'INACTIVE'>) {
    setUpdatingStudentId(student.id);
    setNotice('');
    try {
      const response = await apiFetch<{ user: User }>(`/users/${student.id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setStudents((current) => current.map((item) => (item.id === student.id ? response.user : item)));
      setNotice(status === 'ACTIVE' ? `Acesso de ${student.name} ativado com sucesso.` : `Acesso de ${student.name} desativado.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.');
    } finally {
      setUpdatingStudentId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir este aluno e seus dados?')) return;
    await apiFetch(`/students/${id}`, { method: 'DELETE' });
    setStudents((current) => current.filter((item) => item.id !== id));
  }

  async function addSheet() {
    if (!selected || !url) return;
    await apiFetch('/spreadsheets', {
      method: 'POST',
      body: JSON.stringify({ userId: selected, title, externalUrl: url }),
    });
    setNotice('Planilha vinculada com sucesso.');
    setUrl('');
  }

  return (
    <div className="mt-7 grid gap-7 lg:grid-cols-2">
      <Panel className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">Gestão de alunos</h2>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-emerald-300">{students.length}</span>
        </div>
        {notice ? <p role="status" className="mt-4 text-sm font-semibold text-emerald-300">{notice}</p> : null}
        <div className="mt-5 space-y-3">
          {students.map((student) => {
            const active = student.subscriptionStatus === 'ACTIVE';
            return (
              <div key={student.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-zinc-100">{student.name}</p>
                    <p className="text-xs text-zinc-400">{student.email}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${active ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                      {student.subscriptionStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updatingStudentId === student.id}
                      onClick={() => changeSubscription(student, active ? 'INACTIVE' : 'ACTIVE')}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${active ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                    >
                      {updatingStudentId === student.id ? 'Atualizando...' : active ? 'Desativar' : 'Ativar Aluno'}
                    </button>
                    <Button variant="danger" onClick={() => remove(student.id)}>Excluir</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-6">
        <h2 className="font-display text-2xl font-bold text-white">Planilhas e feedbacks</h2>
        <div className="mt-5 space-y-3">
          <select className="field-control" value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Selecione um aluno</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <input className="field-control" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" />
          <input className="field-control" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="URL da planilha ou Google Sheets" />
          <Button onClick={addSheet}>Vincular planilha</Button>
        </div>
        <h3 className="mt-8 font-display text-lg font-bold text-zinc-100">Feedbacks recentes</h3>
        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
          {feedbacks.map((item) => (
            <div key={item.id} className="rounded-xl bg-zinc-900/70 p-3 text-xs text-zinc-300">
              <strong>{item.user.name}</strong> · cansaço {item.fatigueLevel}/10 · dores {item.jointPainLevel}/10
              <p className="mt-1 text-zinc-400">{item.message || 'Sem comentário'}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
