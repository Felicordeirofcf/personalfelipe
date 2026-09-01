import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Webhook recebido do Mercado Pago:", JSON.stringify(body));

    // 1. Identifica o ID do pedido (suporta external_reference, orderId ou dados da simulação)
    const orderId = body.orderId ?? body.external_reference ?? body.data?.external_reference;

    // 2. Identifica se o pagamento foi aprovado (suporta múltiplos formatos de status)
    const status = body.status ?? body.data?.status;
    const paymentStatusField = body.paymentStatus;
    
    const isApproved = 
      status === 'approved' || 
      status === 'processed' || 
      paymentStatusField === 'APPROVED' || 
      body.action === 'order.processed';

    // Se não tiver ID ou não for aprovado/processado, apenas retorna 200 para o MP não ficar re-tentando
    if (!orderId || !isApproved) {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    // 3. Atualiza o pedido no Supabase
    const order = await prisma.order.update({
      where: { id: String(orderId) },
      data: { 
        paymentStatus: 'APPROVED', 
        deliveryStatus: 'PENDING_REVIEW' 
      }
    });

    return NextResponse.json({ 
      received: true, 
      orderId: order.id, 
      status: order.paymentStatus 
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    // Retornamos 200 mesmo em caso de erro de banco para evitar loop de reenvio do Mercado Pago, 
    // mas logamos o erro no console da Vercel.
    return NextResponse.json({ error: 'Erro interno ao processar webhook.' }, { status: 200 });
  }
}