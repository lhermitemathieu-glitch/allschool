import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request) {
  const { pathname } = request.nextUrl

  // Pages publiques toujours accessibles
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/blog') || pathname.startsWith('/candidat')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Vérifie si l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Pas connecté → redirection vers /login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et l'API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
