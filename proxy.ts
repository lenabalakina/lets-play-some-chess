import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseConfigured = supabaseUrl?.startsWith('http')

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/dashboard') ||
                      path.startsWith('/game') ||
                      (path.startsWith('/play') &&
                       !path.startsWith('/play/local') &&
                       !path.startsWith('/play/ai') &&
                       !path.startsWith('/play/online') &&
                       !path.startsWith('/play/3d'))

  // No Supabase — block protected routes instead of leaving them wide open
  if (!supabaseConfigured || !supabaseKey) {
    if (isProtected) {
      const url = new URL('/login', request.url)
      url.searchParams.set('error', 'accounts-disabled')
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl!, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|stockfish\\.js|stockfish\\.wasm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
