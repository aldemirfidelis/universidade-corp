import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/primeiro-acesso', '/recuperar-senha', '/validar'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const token = request.cookies.get('uc_token')?.value;

  if (pathname === '/') {
    // Visitante vê a landing comercial; usuário logado vai direto para o app.
    if (token) return NextResponse.redirect(new URL('/inicio', request.url));
    return NextResponse.next();
  }

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|api).*)'],
};
