import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configura o SDK do Mercado Pago com o token de produção
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const required = ['productId', 'clientName', 'clientEmail', 'clientWhatsapp', 'answersAnamnesis'];

    if (required.some(k => !body[k])) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: body.productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }

    // 1. Cria o pedido no banco respeitando exatamente o seu Schema do Prisma
    const order = await prisma.order.create({
      data: {
        productId: body.productId,
        clientName: String(body.clientName).trim(),
        clientEmail: String(body.clientEmail).trim().toLowerCase(),
        clientWhatsapp: String(body.clientWhatsapp).trim(),
        answersAnamnesis: JSON.stringify(body.answersAnamnesis),
      },
    });

    // 2. Cria a preferência de pagamento no Mercado Pago (Valor fixo de R$ 50,00)
    const preference = new Preference(client);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://evotrainer.com.br';

    const result = await preference.create({
      body: {
        items: [
          {
            id: product.id,
            title: product.name || 'Planilha de Treino Personalizada - EVOTrainer',
            quantity: 1,
            unit_price: 50.0,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: order.clientName,
          email: order.clientEmail,
        },
        back_urls: {
          success: `${baseUrl}/checkout/sucesso?id=${order.id}`,
          failure: `${baseUrl}/checkout?error=true`,
          pending: `${baseUrl}/checkout/sucesso?id=${order.id}`,
        },
        auto_return: 'approved',
        external_reference: order.id,
      },
    });

    // 3. Retorna o ID do pedido e o link de redirecionamento oficial do Mercado Pago (init_point)
    return NextResponse.json({
      id: order.id,
      init_point: result.init_point,
    }, { status: 201 });

  } catch (error) {
    console.error('Erro no checkout/pedido:', error);
    return NextResponse.json({ error: 'JSON inválido ou erro interno.' }, { status: 500 });
  }
}