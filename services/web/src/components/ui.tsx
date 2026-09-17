import { LoaderCircle } from 'lucide-react';
import { HTMLAttributes, ReactNode } from 'react';

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-lime-700">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-ink md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink/60">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-[1.75rem] border border-ink/10 bg-white shadow-soft ${className}`} {...props} />;
}

export function StatusBadge({ status }: { status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'PENDING' }) {
  const styles = {
    DRAFT: 'bg-amber-100 text-amber-800',
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    ARCHIVED: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-violet-100 text-violet-800',
  } as const;
  const labels = { DRAFT: 'Rascunho', ACTIVE: 'Ativo', ARCHIVED: 'Arquivado', PENDING: 'Pendente' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${styles[status]}`}>{labels[status]}</span>;
}

export function Button({ children, loading, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'dark' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-lime-500 text-white hover:bg-lime-600 shadow-lime-500/20',
    dark: 'bg-ink text-white hover:bg-ink/90 shadow-ink/15',
    ghost: 'border border-ink/10 bg-white text-ink hover:bg-sand',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle size={17} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'success' | 'error'; children: ReactNode }) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
  };
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles[kind]}`}>{children}</div>;
}
