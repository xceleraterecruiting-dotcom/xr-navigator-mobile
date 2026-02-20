import * as SecureStore from 'expo-secure-store'

// Token storage for Clerk (persists sessions across app restarts)
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // Token save failure is non-critical — user will re-auth
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Token clear failure is non-critical
    }
  },
}
