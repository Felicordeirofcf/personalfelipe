'use client';

import { useState } from 'react';

export default function CheckoutForm({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData(e.currentTarget);
    const payload = {
      productId,
      clientName: form.get('clientName'),
      clientEmail: form.get('clientEmail'),
      clientWhatsapp: form.get('clientWhatsapp'),
      answersAnamnesis: {
        level: form.get('level'),
        injuries: form.get('injuries'),
        goals: form.get('goals'),
        frequency: form.get('frequency'),
        equipment: form.get('equipment'),
      },
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Não foi possível criar o pedido.');
        setLoading(false);
        return;
      }

      // Se a API retornou o link do Mercado Pago, redireciona o cliente para o pagamento real
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError('Link de pagamento não gerado. Verifique as credenciais.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao processar o pagamento.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 md:p-8">
      <div className="mb-6 rounded-xl bg-[#f2f8d6] p-4 text-sm">
        <strong>Planilha individual · R$ 50,00</strong>
        <p className="mt-1 text-gray-600">A anamnese abaixo faz parte do processo de curadoria profissional.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Nome completo
          <input required name="clientName" className="field mt-2" placeholder="Seu nome" />
        </label>
        <label className="text-sm font-semibold">
          E-mail
          <input required type="email" name="clientEmail" className="field mt-2" placeholder="voce@email.com" />
        </label>
        <label className="text-sm font-semibold">
          WhatsApp
          <input required name="clientWhatsapp" className="field mt-2" placeholder="(11) 99999-9999" />
        </label>
        <label className="text-sm font-semibold">
          Nível
          <select required name="level" className="field mt-2">
            <option value="">Selecione</option>
            <option>Iniciante</option>
            <option>Intermediário</option>
            <option>Avançado</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Frequência semanal
          <select required name="frequency" className="field mt-2">
            <option>2 dias</option>
            <option>3 dias</option>
            <option>4 dias</option>
            <option>5+ dias</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Equipamentos disponíveis
          <input name="equipment" className="field mt-2" placeholder="Academia, halteres, casa..." />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Objetivos
          <textarea required name="goals" className="field mt-2" rows={3} placeholder="O que você quer alcançar?" />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Lesões, dores ou restrições
          <textarea name="injuries" className="field mt-2" rows={3} placeholder="Conte o que devemos considerar (ou escreva ‘nenhuma’)." />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button disabled={loading} className="btn btn-dark mt-6 w-full disabled:opacity-50">
        {loading ? 'Redirecionando para o Mercado Pago...' : 'Ir para o Pagamento — R$ 50,00'}
      </button>

      <p className="mt-3 text-center text-xs text-gray-500">Ambiente seguro integrado com Mercado Pago.</p>
    </form>
  );
}