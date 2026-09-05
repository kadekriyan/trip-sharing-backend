export interface CreateBookingInput {
  trip_id?: string
  tripId?: string
  destination_id?: string
  destinationId?: string
  full_name?: string
  fullName?: string
  email?: string
  phone_number?: string
  phoneNumber?: string
  country?: string
  nationality?: string
  date_of_birth?: string | Date
  hotel_preference?: string
  passport_number?: string
  identity_type?: string
  identity_number?: string
  identityNumber?: string
  gender?: string
  room_preference?: string
  roomPreference?: string
  room_type?: string
  health_notes?: string
  healthNotes?: string
  preferred_language?: string
  preferredLanguage?: string
  travel_insurance?: boolean
  hasInsurance?: boolean
  departure_date?: string | Date
  departureDate?: string | Date
  return_date?: string | Date
  returnDate?: string | Date
  price_per_pax?: number
  pricePerPax?: number
  duration_days?: number
  durationDays?: number
}
