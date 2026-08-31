import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return Response.json({ error: 'Cliente/pedido não encontrado.' }, { status: 404 });
    await prisma.order.delete({ where: { id } });
    return Response.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return Response.json({ error: 'Não foi possível excluir o cliente.' }, { status: 500 });
  }
}
