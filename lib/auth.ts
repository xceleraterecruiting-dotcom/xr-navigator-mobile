import * as SecureStore from 'expo-secure-store'

// Token storage for Clerk (persists sessions across app restarts)
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (err) {
      console.error('Failed to get token:', err)
      return null
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (err) {
      console.error('Failed to save token:', err)
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (err) {
      console.error('Failed to clear token:', err)
    }
  },
}
