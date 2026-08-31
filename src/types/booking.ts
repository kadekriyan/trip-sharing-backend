export interface CreateBookingInput {
  trip_id: number
  full_name: string
  phone_number: string
  country: string
  date_of_birth: string | Date
  hotel_preference?: string
  passport_number?: string
  identity_type?: string
  room_type?: string
  health_notes?: string
  preferred_language?: string
  travel_insurance?: boolean
}
