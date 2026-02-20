import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '@/lib/api'
import { useAthleteStore } from '@/stores/athleteStore'

interface OnboardingFormData {
  // Step 1 - Basics
  firstName: string
  lastName: string
  position: string
  gradYear: string
  highSchoolName: string
  city: string
  state: string
  ageConfirmation: boolean
  // Step 2 - Academics
  gpa: string
  satScore: string
  actScore: string
  // Step 3 - Measurables
  heightInches: string
  weightLbs: string
  fortyYardDash: string
  benchPress: string
  squat: string
  // Step 4 - Recruiting & Goals
  hudlLink: string
  varsityExperience: boolean | null
  hasOffers: boolean | null
  offers: string
  dreamSchools: string
  targetLevel: string
  // Step 5 - Contact
  email: string
  phone: string
  twitterHandle: string
  parentName: string
  parentEmail: string
  parentPhone: string
  smsConsent: boolean
}

interface OnboardingStore {
  formData: OnboardingFormData
  isSubmitting: boolean
  submitError: string | null
  updateField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void
  updateFields: (fields: Partial<OnboardingFormData>) => void
  submit: () => Promise<boolean>
  reset: () => void
}

const initialFormData: OnboardingFormData = {
  firstName: '',
  lastName: '',
  position: '',
  gradYear: '',
  highSchoolName: '',
  city: '',
  state: '',
  ageConfirmation: false,
  gpa: '',
  satScore: '',
  actScore: '',
  heightInches: '',
  weightLbs: '',
  fortyYardDash: '',
  benchPress: '',
  squat: '',
  hudlLink: '',
  varsityExperience: null,
  hasOffers: null,
  offers: '',
  dreamSchools: '',
  targetLevel: '',
  email: '',
  phone: '',
  twitterHandle: '',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  smsConsent: false,
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      formData: { ...initialFormData },
      isSubmitting: false,
      submitError: null,

      updateField: (field, value) =>
        set((state) => ({
          formData: { ...state.formData, [field]: value },
          submitError: null,
        })),

      updateFields: (fields) =>
        set((state) => ({
          formData: { ...state.formData, ...fields },
          submitError: null,
        })),

      submit: async () => {
        const { formData } = get()
        set({ isSubmitting: true, submitError: null })

        try {
          const payload = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            position: formData.position,
            gradYear: parseInt(formData.gradYear, 10),
            highSchoolName: formData.highSchoolName.trim(),
            city: formData.city.trim(),
            state: formData.state,
            gpa: formData.gpa ? parseFloat(formData.gpa) : null,
            satScore: formData.satScore ? parseInt(formData.satScore, 10) : null,
            actScore: formData.actScore ? parseInt(formData.actScore, 10) : null,
            heightInches: formData.heightInches ? parseInt(formData.heightInches, 10) : null,
            weightLbs: formData.weightLbs ? parseInt(formData.weightLbs, 10) : null,
            fortyYardDash: formData.fortyYardDash ? parseFloat(formData.fortyYardDash) : null,
            benchPress: formData.benchPress ? parseInt(formData.benchPress, 10) : null,
            squat: formData.squat ? parseInt(formData.squat, 10) : null,
            hudlLink: formData.hudlLink.trim() || null,
            varsityExperience: formData.varsityExperience ?? false,
            hasOffers: formData.hasOffers ?? false,
            offers: formData.offers.trim() || null,
            dreamSchools: formData.dreamSchools.trim() || null,
            targetLevel: formData.targetLevel || null,
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            twitterHandle: formData.twitterHandle.trim() || null,
            parentName: formData.parentName.trim() || null,
            parentEmail: formData.parentEmail.trim() || null,
            parentPhone: formData.parentPhone.trim() || null,
            smsConsent: formData.smsConsent,
          }

          await api.submitOnboarding(payload)

          // Immediately mark onboarding as complete to prevent redirect loop
          // (fetchAthlete may not return onboardingComplete depending on API response shape)
          useAthleteStore.setState({ needsOnboarding: false })

          // Refresh athlete data
          await useAthleteStore.getState().fetchAthlete()

          // Ensure needsOnboarding stays false even if fetchAthlete didn't set it
          useAthleteStore.setState({ needsOnboarding: false })

          set({ isSubmitting: false })

          // Clear persisted form data
          get().reset()

          return true
        } catch (err: any) {
          const message = err instanceof Error ? err.message : 'Failed to save profile'
          set({ isSubmitting: false, submitError: message })
          return false
        }
      },

      reset: () => set({ formData: { ...initialFormData }, isSubmitting: false, submitError: null }),
    }),
    {
      name: 'onboarding-form',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ formData: state.formData }),
    }
  )
)

// Validation helpers
export function validateStep1(data: OnboardingFormData): string | null {
  if (!data.firstName.trim()) return 'First name is required'
  if (!data.lastName.trim()) return 'Last name is required'
  if (!data.position) return 'Position is required'
  if (!data.gradYear) return 'Graduation year is required'
  if (!data.highSchoolName.trim()) return 'High school name is required'
  if (!data.city.trim()) return 'City is required'
  if (!data.state) return 'State is required'
  if (!data.ageConfirmation) return 'You must confirm you are 13 or older'
  return null
}

export function validateStep2(data: OnboardingFormData): string | null {
  if (!data.gpa.trim()) return 'GPA is required'
  const gpa = parseFloat(data.gpa)
  if (isNaN(gpa) || gpa < 0 || gpa > 5) return 'GPA must be between 0.0 and 5.0'
  return null
}

export function validateStep3(data: OnboardingFormData): string | null {
  if (!data.heightInches) return 'Height is required'
  if (!data.weightLbs.trim()) return 'Weight is required'
  const weight = parseInt(data.weightLbs, 10)
  if (isNaN(weight) || weight < 80 || weight > 400) return 'Weight must be between 80 and 400 lbs'
  if (data.fortyYardDash) {
    const forty = parseFloat(data.fortyYardDash)
    if (isNaN(forty) || forty < 4.0 || forty > 7.0) return '40 time must be between 4.0 and 7.0'
  }
  return null
}

export function validateStep4(data: OnboardingFormData): string | null {
  if (!data.targetLevel) return 'Target level is required'
  if (data.hudlLink && !data.hudlLink.match(/^https?:\/\//)) return 'Film link must start with http:// or https://'
  return null
}

export function validateStep5(data: OnboardingFormData): string | null {
  if (!data.email.trim()) return 'Email is required'
  if (!data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Enter a valid email address'
  if (!data.phone.trim()) return 'Phone number is required'
  if (data.phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number (10+ digits)'
  if (!data.parentPhone.trim()) return 'Parent phone number is required'
  if (data.parentPhone.replace(/\D/g, '').length < 10) return 'Enter a valid parent phone number (10+ digits)'
  if (!data.smsConsent) return 'SMS consent is required to proceed'
  return null
}
