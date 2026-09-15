export interface CreateAreaInput {
  name: string
  slug?: string
  city?: string | null
  province?: string | null
  description?: string | null
  isActive?: boolean
  is_active?: boolean
}

export interface UpdateAreaInput {
  name?: string
  slug?: string
  city?: string | null
  province?: string | null
  description?: string | null
  isActive?: boolean
  is_active?: boolean
}

export interface AreaFilterInput {
  isActive?: boolean
  is_active?: boolean
  search?: string
  city?: string
  province?: string
}

export interface AreaResponse {
  id: string
  name: string
  slug: string
  city: string | null
  province: string | null
  description: string | null
  isActive: boolean
  is_active: boolean
  driversCount?: number
  vehiclesCount?: number
  createdAt?: Date | string
  updatedAt?: Date | string
}
