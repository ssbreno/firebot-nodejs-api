export interface Post {
  id: string
  title: string
  content: string
  imageUrl: string | null
  createdAt: Date
  shortDescription: string
  type: string[]
  topics: string[]
  slug: string
  language: string
}

export interface PostFilters {
  type?: string
  search?: string
  sortBy?: 'date' | 'title'
  page?: number
  limit?: number
  language?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    totalPages: number
    currentPage: number
    limit: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
