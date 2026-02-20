import { create } from 'zustand'
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases'
import { api } from '@/lib/api'
import type { SubscriptionUsage } from '@/types'

const PRO_ENTITLEMENT_ID = 'Xcelerate Recruiting Pro'

interface SubscriptionState {
  isPro: boolean
  proEnabled: boolean
  customerInfo: CustomerInfo | null
  packages: PurchasesPackage[]
  usage: SubscriptionUsage | null
  isLoading: boolean
  isRestoring: boolean
  error: string | null
}

interface SubscriptionActions {
  checkEntitlements: () => Promise<void>
  fetchUsage: () => Promise<void>
  fetchOfferings: () => Promise<void>
  purchase: (pkg: PurchasesPackage) => Promise<boolean>
  restorePurchases: () => Promise<void>
  clearError: () => void
}

type SubscriptionStore = SubscriptionState & SubscriptionActions

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  isPro: __DEV__, // Pro in dev mode for testing
  proEnabled: false,
  customerInfo: null,
  packages: [],
  usage: null,
  isLoading: false,
  isRestoring: false,
  error: null,

  checkEntitlements: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo()
      const isPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined
      set({ customerInfo, isPro })
    } catch (err) {
      // Non-critical — will retry on next app foreground
    }
  },

  fetchUsage: async () => {
    try {
      const data = await api.getSubscription()
      set({
        usage: data.subscription.usage,
        proEnabled: data.proEnabled,
        // Also sync isPro from backend in case RevenueCat hasn't updated yet
        isPro: get().isPro || data.subscription.isPro,
      })
    } catch (err) {
      // Non-critical — usage counts show stale data until next refresh
    }
  },

  fetchOfferings: async () => {
    set({ isLoading: true, error: null })
    try {
      const offerings = await Purchases.getOfferings()
      const packages = offerings.current?.availablePackages ?? []
      set({ packages, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plans'
      set({ error: message, isLoading: false })
    }
  },

  purchase: async (pkg) => {
    set({ isLoading: true, error: null })
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      const isPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined
      set({ customerInfo, isPro, isLoading: false })
      // Refresh usage from backend after purchase
      if (isPro) get().fetchUsage()
      return isPro
    } catch (err: any) {
      if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        set({ isLoading: false })
        return false
      }
      const message = err instanceof Error ? err.message : 'Purchase failed'
      set({ error: message, isLoading: false })
      return false
    }
  },

  restorePurchases: async () => {
    set({ isRestoring: true, error: null })
    try {
      const customerInfo = await Purchases.restorePurchases()
      const isPro = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined
      set({ customerInfo, isPro, isRestoring: false })
      if (isPro) get().fetchUsage()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed'
      set({ error: message, isRestoring: false })
    }
  },

  clearError: () => set({ error: null }),
}))

// Selectors
export const useIsPro = () => useSubscriptionStore((state) => state.isPro)
export const useUsage = () => useSubscriptionStore((state) => state.usage)
export const useProEnabled = () => useSubscriptionStore((state) => state.proEnabled)
