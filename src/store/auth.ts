import type { User } from '@/types/type'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    user: {} as User | null,
    token: null as string | null,
  }),
  actions: {
    login(user: User, token: string) {
      this.isLoggedIn = true
      this.user = user
      this.token = token as string | null
    },
    logout() {
      this.isLoggedIn = false
      this.user = null
      this.token = null as string | null
    },
  },
})
