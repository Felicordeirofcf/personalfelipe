import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function GET() { const orders = await prisma.order.findMany({ where: { paymentStatus: 'APPROVED', deliveryStatus: 'PENDING_REVIEW' }, include: { product: true }, orderBy: { createdAt: 'asc' } }); return NextResponse.json(orders); }
