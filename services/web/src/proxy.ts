import { NextRequest, NextResponse } from 'next/server';

const ROLE_COOKIE_KEY = 'consultoriafit_role';
const STUDENT_ROUTES = ['/aluno', '/anamnese', '/treino', '/checkin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(ROLE_COOKIE_KEY)?.value;

  // O cookie é apenas uma dica de navegação. A autorização real permanece na API JWT.
  if (!role) return NextResponse.next();

  if (pathname === '/login') {
    return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin' : '/aluno', request.url));
  }

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/aluno', request.url));
  }

  if (STUDENT_ROUTES.some((route) => pathname.startsWith(route)) && role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/aluno/:path*', '/anamnese/:path*', '/treino/:path*', '/checkin/:path*', '/login'],
};
