import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const order = await prisma.order.update({ where: { id }, data: { paymentStatus: 'APPROVED', deliveryStatus: 'PENDING_REVIEW' } }); return NextResponse.json({ ok: true, id: order.id }); }
