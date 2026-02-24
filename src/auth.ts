import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Validate NEXTAUTH_SECRET is set
const nextAuthSecret = process.env.NEXTAUTH_SECRET
if (!nextAuthSecret || nextAuthSecret === 'your-secret-key-here') {
  console.error('❌ CRITICAL: NEXTAUTH_SECRET is not properly set!')
  console.error('Please set NEXTAUTH_SECRET in your Vercel environment variables')
  console.error('Generate one with: openssl rand -base64 32')
  
  if (process.env.NODE_ENV === 'production') {
    // In production, we still need to export handlers, but they will fail gracefully
    console.error('⚠️  NextAuth will not work until NEXTAUTH_SECRET is set')
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Logging only in development
const isDev = process.env.NODE_ENV === 'development'
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[AUTH] ${message}`, data || '')
  }
}

const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          log('authorize() called', { email: credentials?.email })
          
          const validatedCredentials = loginSchema.safeParse(credentials)

          if (!validatedCredentials.success) {
            log('❌ Validation failed', validatedCredentials.error.errors)
            return null
          }

          log('✅ Credentials validated')

          const user = await prisma.user.findUnique({
            where: { email: validatedCredentials.data.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              isActive: true,
              departmentId: true,
            },
          })

          if (!user) {
            log('❌ User not found', { email: validatedCredentials.data.email })
            console.error(`[AUTH] User not found: ${validatedCredentials.data.email}`)
            return null
          }

          log('✅ User found', { id: user.id, email: user.email, isActive: user.isActive })

          if (!user.isActive) {
            log('❌ User is not active')
            console.error(`[AUTH] User is not active: ${user.email}`)
            return null
          }

          log('🔐 Verifying password...')
          
          // Verify password exists
          if (!user.password) {
            log('❌ User has no password set')
            console.error(`[AUTH] User has no password: ${user.email}`)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            validatedCredentials.data.password,
            user.password
          )

          log('Password verification result', { isPasswordValid })

          if (!isPasswordValid) {
            log('❌ Password verification failed')
            console.error(`[AUTH] Password mismatch for: ${user.email}`)
            return null
          }

          log('✅ Password verified successfully')

          const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            departmentId: user.departmentId,
          }

          log('✅ Returning user object', { id: sessionUser.id, email: sessionUser.email })
          return sessionUser
        } catch (error) {
          log('❌ Error in authorize()', error)
          console.error('[AUTH] Error in authorize():', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      try {
        log('jwt() callback called', { userId: user?.id, hasUser: !!user, hasAccount: !!account })
        
        if (user) {
          log('✅ User object in jwt callback', { id: user.id, email: (user as any).email })
          token.id = user.id
          token.role = (user as any).role
          token.departmentId = (user as any).departmentId
          log('✅ Token updated with user data', { tokenId: token.id, role: token.role })
        } else {
          log('⚠️  No user object in jwt callback (this is normal on subsequent requests)')
        }
        
        return token
      } catch (error) {
        log('❌ Error in jwt callback', error)
        console.error('[AUTH] Error in jwt callback:', error)
        throw error
      }
    },
    async session({ session, token }: any) {
      try {
        log('session() callback called', { tokenId: token.id, hasSessionUser: !!session.user })
        
        if (session.user) {
          session.user.id = token.id as string
          session.user.role = token.role as string
          session.user.departmentId = token.departmentId as string
          log('✅ Session updated with token data', { userId: session.user.id, role: session.user.role })
        } else {
          log('❌ No session.user object')
        }
        
        return session
      } catch (error) {
        log('❌ Error in session callback', error)
        console.error('[AUTH] Error in session callback:', error)
        throw error
      }
    },
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)

// Export getServerSession helper
export async function getServerSessionHelper() {
  return await auth()
}
