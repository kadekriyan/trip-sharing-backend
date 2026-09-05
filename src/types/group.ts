export interface CreateGroupInput {
  tripId?: string
  trip_id?: string
  driverId?: string | null
  driver_id?: string | null
  groupNumber?: number
  group_number?: number
  maxParticipants?: number
  max_participants?: number
  pricePerPerson?: number
  price_per_person?: number
  status?: string
}

export interface UpdateGroupInput {
  driverId?: string | null
  driver_id?: string | null
  groupNumber?: number
  group_number?: number
  maxParticipants?: number
  max_participants?: number
  pricePerPerson?: number
  price_per_person?: number
  status?: string
}

export interface AssignDriverInput {
  driverId?: string | null
  driver_id?: string | null
}

export interface GroupFilterInput {
  tripId?: string
  trip_id?: string
  status?: string
  driverId?: string
  driver_id?: string
  search?: string
}
