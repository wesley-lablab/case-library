export interface Case {
  id: string
  title: string
  type: CaseType
  amount: number
  date: string
  summary: string
  status: 'pending' | 'in_progress' | 'completed'
  isSelected?: boolean
  name?: string
  location?: string
  completedAmount?: number
  description?: string
  images?: string[]
  documentUrl?: string
  documentType?: 'ppt' | 'pdf' | 'word'
  uploadedFileName?: string
  challenge?: string
  solution?: string
  results?: string
  testimonial?: string
}

export type CaseType =
  | 'meeting'
  | 'event'
  | 'exhibition'
  | 'incentive_travel'
  | 'marketing'

export interface FilterState {
  dateRange: {
    start: string | null
    end: string | null
  }
  types: CaseType[]
  amountRange: {
    min: number
    max: number
  }
}

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalPages: number
}

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  meeting: '会议',
  event: '活动',
  exhibition: '展览',
  incentive_travel: '奖励旅游',
  marketing: '营销',
}

export const CASE_TYPE_COLORS: Record<CaseType, string> = {
  meeting: 'bg-blue-100 text-blue-800',
  event: 'bg-amber-100 text-amber-800',
  exhibition: 'bg-violet-100 text-violet-800',
  incentive_travel: 'bg-emerald-100 text-emerald-800',
  marketing: 'bg-rose-100 text-rose-800',
}
