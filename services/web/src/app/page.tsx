import { Activity, ArrowRight, BadgeCheck, Check, ClipboardList, Dumbbell, HeartPulse, ShieldCheck, Sparkles, Target, UsersRound } from 'lucide-react';
import Link from 'next/link';

const benefits = [
  { icon: Target, title: 'Treino feito para você', text: 'Objetivos, rotina, experiência e limitações viram uma estratégia que cabe na sua vida.' },
  { icon: HeartPulse, title: 'Biomecânica em primeiro lugar', text: 'Cada escolha considera movimentos, dores e restrições para você evoluir com segurança.' },
  { icon: UsersRound, title: 'Acompanhamento de verdade', text: 'Seu personal revisa a prescrição e acompanha sua progressão, não é uma ficha genérica.' },
];

const steps = [
  { number: '01', title: 'Inscrição e pagamento', text: 'Escolha seu plano e confirme sua inscrição de forma rápida e segura.' },
  { number: '02', title: 'Anamnese biomecânica', text: 'Conte seus objetivos, rotina, histórico e tudo que o treino precisa respeitar.' },
  { number: '03', title: 'Treino liberado no aplicativo', text: 'Receba seu plano aprovado, vídeos de execução e registre sua evolução.' },
];

const plans = [
  { name: 'Mensal', price: 'R$ 89', cycle: '/mês', description: 'Para começar com acompanhamento próximo.', featured: false, benefits: ['Prescrição individualizada', 'Anamnese biomecânica', 'Treino no aplicativo', 'Revisão profissional'] },
  { name: 'Trimestral', price: 'R$ 229', cycle: '/trimestre', description: 'Mais consistência e melhor custo-benefício.', featured: true, benefits: ['Tudo do plano mensal', 'Acompanhamento por 90 dias', 'Ajustes de progressão', 'Economia de R$ 38'] },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      <section className="relative px-5 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute -left-40 top-12 h-96 w-96 rounded-full bg-lime-300/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-lime-500/20 bg-lime-50 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-lime-700"><Sparkles size={15} /> Consultoria online individual</div>
            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.02] tracking-[-0.055em] text-ink md:text-7xl">Treine com um plano que entende <span className="text-lime-600">você.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-ink/60">Acompanhamento individualizado e prescrição chancelada por Personal Trainer com CREF para você evoluir com clareza, segurança e constância.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="#planos" className="inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-4 text-sm font-extrabold text-white shadow-xl shadow-ink/15 transition hover:-translate-y-1">Quero começar agora <ArrowRight size={18} /></Link><Link href="#como-funciona" className="inline-flex items-center gap-2 rounded-2xl border border-ink/15 bg-white px-6 py-4 text-sm font-extrabold text-ink transition hover:border-ink/35">Ver como funciona</Link></div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-ink/50"><span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-lime-600" /> Prescrição revisada por profissional</span><span className="inline-flex items-center gap-2"><BadgeCheck size={16} className="text-lime-600" /> Sem treino genérico</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-lime-300/40 blur-3xl" />
            <div className="relative rounded-[2.5rem] bg-ink p-5 text-white shadow-2xl shadow-ink/25 md:p-7">
              <div className="grid-texture absolute inset-0 rounded-[2.5rem] opacity-70" /><div className="relative"><div className="mb-7 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime-300">Seu próximo nível</p><h2 className="mt-2 font-display text-2xl font-bold">Plano sob medida</h2></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-300 text-ink"><Dumbbell size={22} /></span></div><div className="space-y-3">{['Objetivo: força e composição corporal', '4 treinos por semana', 'Ajustes com base na sua evolução'].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-ink"><span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-xs font-black">0{index + 1}</span><span className="text-sm font-extrabold">{item}</span></div>)}</div><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-white/60"><ShieldCheck size={16} className="text-lime-300" /> Acompanhamento com responsabilidade técnica</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="border-y border-ink/10 bg-white/70 px-5 py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-lime-700">Por que ConsultoriaFit</p><h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">Menos tentativa. Mais direção.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[1.75rem] border border-ink/10 bg-[#f8faf6] p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-lime-700"><Icon size={23} /></span><h3 className="mt-7 font-display text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-ink/55">{text}</p></article>)}</div></div></section>

      <section id="como-funciona" className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-lime-700">Como funciona</p><h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">Do primeiro passo ao treino liberado.</h2></div><p className="max-w-sm text-sm leading-6 text-ink/50">Um processo simples, com olhar técnico em cada etapa.</p></div><div className="mt-14 grid gap-4 md:grid-cols-3">{steps.map((step) => <article key={step.number} className="relative rounded-[1.75rem] border border-ink/10 bg-white p-7 shadow-soft"><span className="font-display text-5xl font-bold text-lime-500/30">{step.number}</span><h3 className="mt-8 font-display text-xl font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-ink/55">{step.text}</p></article>)}</div></div></section>

      <section id="planos" className="bg-ink px-5 py-20 text-white lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-lime-300">Planos de acompanhamento</p><h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">Seu compromisso começa com uma escolha.</h2><p className="mt-5 leading-7 text-white/55">Escolha o ritmo que combina com seu momento. Você pode iniciar sua inscrição e preencher a anamnese logo depois.</p></div><div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">{plans.map((plan) => <article key={plan.name} className={`relative rounded-[2rem] p-7 md:p-9 ${plan.featured ? 'bg-lime-300 text-ink shadow-2xl shadow-lime-300/20' : 'border border-white/15 bg-white/8'}`}>{plan.featured ? <span className="absolute -top-3 right-6 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-lime-700">Mais escolhido</span> : null}<p className={`text-xs font-extrabold uppercase tracking-[0.18em] ${plan.featured ? 'text-ink/55' : 'text-lime-300'}`}>{plan.name}</p><div className="mt-5 flex items-end gap-2"><span className="font-display text-5xl font-bold">{plan.price}</span><span className={`pb-2 text-sm font-bold ${plan.featured ? 'text-ink/50' : 'text-white/45'}`}>{plan.cycle}</span></div><p className={`mt-3 text-sm ${plan.featured ? 'text-ink/60' : 'text-white/55'}`}>{plan.description}</p><ul className="mt-7 space-y-3">{plan.benefits.map((benefit) => <li key={benefit} className="flex items-center gap-2 text-sm font-bold"><Check size={16} className={plan.featured ? 'text-lime-700' : 'text-lime-300'} /> {benefit}</li>)}</ul><Link href="/anamnese" className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-extrabold transition hover:-translate-y-0.5 ${plan.featured ? 'bg-ink text-white hover:bg-ink/90' : 'bg-lime-300 text-ink hover:bg-lime-100'}`}>Contratar agora <ArrowRight size={17} /></Link></article>)}</div></div></section>

      <section className="px-5 py-16 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[2rem] border border-lime-500/20 bg-lime-50 p-8 md:flex-row md:items-center md:p-10"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime-700">Ainda com dúvidas?</p><h2 className="mt-2 font-display text-2xl font-bold">Fale com a ConsultoriaFit.</h2><p className="mt-2 text-sm text-ink/55">Estamos aqui para ajudar você a encontrar o melhor ponto de partida.</p></div><a href="mailto:contato@consultoriafit.com.br" className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-extrabold text-white">Enviar mensagem <ArrowRight size={16} /></a></div></section>
    </div>
  );
}
