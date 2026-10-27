import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Renueva la sesion en cada request y protege la app: sin sesion -> /login.
// No hay bypass: la subida de fotos va del navegador a Storage con políticas
// `authenticated`, así que sin sesión falla aunque el resto de la app funcione.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith('/login');
  // Rutas accesibles sin sesión:
  // - /ficha/[id]   -> ficha pública del deportista
  // - /propuestas/* -> propuestas comerciales que se comparten por enlace
  // - /grupo/[token] -> ficha grupal (solo datos generales) para el responsable del grupo
  // - /api/integrations/* -> la consume Lynko con su propia clave (LYNKO_SYNC_KEY), no con sesión
  const isPublic =
    isLogin ||
    pathname.startsWith('/ficha') ||
    pathname.startsWith('/propuestas') ||
    pathname.startsWith('/grupo/') ||
    pathname.startsWith('/api/integrations/');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
