export interface BookingItemInput {
  trip_id?: string
  tripId?: string
  destination_id?: string
  destinationId?: string
  booking_group_id?: string
  bookingGroupId?: string
  full_name?: string
  fullName?: string
  name?: string
  email?: string
  phone_number?: string
  phoneNumber?: string
  phone?: string
  country?: string
  nationality?: string
  date_of_birth?: string | Date
  dateOfBirth?: string | Date
  gender?: string
  health_notes?: string
  healthNotes?: string
  preferred_language?: string
  preferredLanguage?: string
  pickup_location?: string
  pickupLocation?: string
  pickup_latitude?: number
  pickupLatitude?: number
  pickup_longitude?: number
  pickupLongitude?: number
  pickup_notes?: string
  pickupNotes?: string
  departure_date?: string | Date
  departureDate?: string | Date
  return_date?: string | Date
  returnDate?: string | Date
  price_per_pax?: number
  pricePerPax?: number
  duration_days?: number
  durationDays?: number
}

export interface CreateBookingInput extends BookingItemInput {
  captcha_token?: string
  captchaToken?: string
  gRecaptchaResponse?: string
  'g-recaptcha-response'?: string
}

export interface CreateBulkBookingInput {
  captcha_token?: string
  captchaToken?: string
  gRecaptchaResponse?: string
  'g-recaptcha-response'?: string
  bookings: BookingItemInput[]
}
