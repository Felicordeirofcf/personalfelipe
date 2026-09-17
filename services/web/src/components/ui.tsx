import { LoaderCircle } from 'lucide-react';
import { HTMLAttributes, ReactNode } from 'react';

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-3xl"><p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-400">{eyebrow}</p><h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-white md:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">{description}</p></div>{action}</div>;
}

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[1.75rem] border border-zinc-800 bg-[#131B2E] text-zinc-100 shadow-soft ${className}`} {...props} />;
}

export function StatusBadge({ status }: { status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'PENDING' }) {
  const styles = {
    DRAFT: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    ACTIVE: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    ARCHIVED: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
    PENDING: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
  } as const;
  const labels = { DRAFT: 'Rascunho', ACTIVE: 'Liberado', ARCHIVED: 'Arquivado', PENDING: 'Pendente' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${styles[status]}`}>{labels[status]}</span>;
}

export function Button({ children, loading, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'dark' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/20',
    dark: 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20',
    ghost: 'border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800',
    danger: 'border border-red-500/25 bg-red-950/40 text-red-300 hover:bg-red-900/60',
  };
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[variant]} ${className}`} disabled={loading || props.disabled} {...props}>{loading ? <LoaderCircle size={17} className="animate-spin" /> : null}{children}</button>;
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'success' | 'error'; children: ReactNode }) {
  const styles = {
    info: 'border-blue-400/25 bg-blue-950/40 text-blue-200',
    success: 'border-emerald-400/25 bg-emerald-950/40 text-emerald-200',
    error: 'border-red-400/25 bg-red-950/40 text-red-200',
  };
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles[kind]}`}>{children}</div>;
}
