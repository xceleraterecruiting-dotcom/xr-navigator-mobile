export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'EDGE' | 'LB' | 'CB' | 'S' | 'K' | 'P' | 'ATH'

export type Division = 'D1_FBS_P4' | 'D1_FBS_G5' | 'D1_FCS' | 'D2' | 'D3' | 'NAIA' | 'JUCO'

export type OutreachStatus = 'NOT_CONTACTED' | 'SENT' | 'WAITING' | 'RESPONDED'

export interface Athlete {
  id: string
  clerkUserId: string
  firstName: string
  lastName: string
  email: string
  position: Position | null
  gradYear: number | null
  highSchool: string | null
  city: string | null
  state: string | null
  height: number | null
  weight: number | null
  fortyYard: number | null
  gpa: number | null
  sat: number | null
  act: number | null
  hudlUrl: string | null
  maxprepsUrl: string | null
  twitter: string | null
  partner: string | null
  xp: number
  streak: number
  createdAt: string
  updatedAt: string
}

export interface CollegeCoach {
  id: string
  name: string
  title: string
  school: string
  conference: string | null
  division: Division | null
  email: string | null
  twitter: string | null
  phone: string | null
  imageUrl: string | null
}

export interface SavedCoach {
  id: string
  athleteId: string
  collegeCoachId: string
  collegeCoach: CollegeCoach
  outreachStatus: OutreachStatus
  lastContactedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  athleteId: string
  title: string | null
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface CoachFilters {
  division?: Division
  conference?: string
  position?: Position
  page?: number
  limit?: number
}
