import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ConsultoriaFit', template: '%s | ConsultoriaFit' },
  description: 'Acompanhamento individualizado e prescrição de treinos com responsabilidade profissional.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppHeader />
        <main>{children}</main>
        <footer className="border-t border-ink/10 bg-white px-5 py-10 text-sm text-ink/50">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3"><div><p className="font-display text-lg font-bold text-ink">ConsultoriaFit</p><p className="mt-2 max-w-xs leading-6">Treino individualizado para você evoluir com clareza, segurança e constância.</p></div><div><p className="font-extrabold text-ink">Contato</p><a className="mt-2 block hover:text-ink" href="mailto:contato@consultoriafit.com.br">contato@consultoriafit.com.br</a><a className="mt-1 block hover:text-ink" href="https://wa.me/5500000000000">WhatsApp da consultoria</a></div><div><p className="font-extrabold text-ink">Responsabilidade profissional</p><p className="mt-2 leading-6">Personal Trainer responsável · CREF: informe seu registro profissional</p><div className="mt-3 flex gap-4 text-xs font-bold"><a href="#" className="hover:text-ink">Termos de uso</a><a href="#" className="hover:text-ink">Privacidade</a></div></div></div><p className="mx-auto mt-9 max-w-7xl border-t border-ink/10 pt-5 text-xs">© {new Date().getFullYear()} ConsultoriaFit. A prescrição não substitui avaliação médica ou fisioterapêutica.</p>
        </footer>
      </body>
    </html>
  );
}
