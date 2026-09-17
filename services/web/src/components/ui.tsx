import { LoaderCircle } from 'lucide-react';
import { HTMLAttributes, ReactNode } from 'react';

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-emerald-400">{eyebrow}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm font-normal leading-7 text-zinc-400 md:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border border-zinc-800/80 bg-[#111622] shadow-xl shadow-black/30 ${className}`} {...props} />;
}

export function StatusBadge({ status }: { status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'PENDING' }) {
  const styles = {
    DRAFT: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    ACTIVE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    ARCHIVED: 'border-zinc-700 bg-zinc-900 text-zinc-400',
    PENDING: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  } as const;
  const labels = { DRAFT: 'Rascunho', ACTIVE: 'Ativo', ARCHIVED: 'Arquivado', PENDING: 'Pendente' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${styles[status]}`}>{labels[status]}</span>;
}

export function Button({ children, loading, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'dark' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/25',
    dark: 'bg-zinc-800 text-white hover:bg-zinc-700 shadow-black/20',
    ghost: 'border border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:border-emerald-500/60 hover:text-white',
    danger: 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  };
  return (
    <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle size={17} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'success' | 'error'; children: ReactNode }) {
  const styles = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
  };
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles[kind]}`}>{children}</div>;
}
