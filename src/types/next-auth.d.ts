import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    departmentId?: string
  }

  interface Session {
    user: User & {
      id: string
      role: string
      departmentId?: string
    }
  }

  interface JWT {
    id: string
    role: string
    departmentId?: string
  }
}
