import AsyncStorage from '@react-native-async-storage/async-storage'

// Storage helpers using AsyncStorage (Expo Go compatible)
// Can swap to MMKV for production builds for better performance

export const storageHelpers = {
  // Generic set/get
  set: async (key: string, value: unknown) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },

  get: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key)
      if (!value) return null
      return JSON.parse(value) as T
    } catch {
      return null
    }
  },

  delete: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error('Storage delete error:', error)
    }
  },

  // Specific helpers
  getAthleteCache: () => storageHelpers.get<import('@/types').Athlete>('athlete_cache'),
  setAthleteCache: (athlete: import('@/types').Athlete) =>
    storageHelpers.set('athlete_cache', athlete),

  getSavedCoachesCache: () =>
    storageHelpers.get<import('@/types').SavedCoach[]>('saved_coaches_cache'),
  setSavedCoachesCache: (coaches: import('@/types').SavedCoach[]) =>
    storageHelpers.set('saved_coaches_cache', coaches),

  clearAll: async () => {
    try {
      await AsyncStorage.clear()
    } catch (error) {
      console.error('Storage clear error:', error)
    }
  },
}
