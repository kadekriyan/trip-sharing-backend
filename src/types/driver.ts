export interface CreateDriverInput {
  userId?: string
  user_id?: string
  fullName?: string
  name?: string
  phoneNumber?: string
  phone?: string
  email?: string
  licenseNumber?: string
  license_number?: string
  licenseExpiryDate?: string | Date | null
  license_expiry_date?: string | Date | null
  activeStartDate?: string | Date | null
  active_start_date?: string | Date | null
  activeEndDate?: string | Date | null
  active_end_date?: string | Date | null
  inactiveStartDate?: string | Date | null
  inactive_start_date?: string | Date | null
  inactiveEndDate?: string | Date | null
  inactive_end_date?: string | Date | null
  experienceYears?: number
  experience_years?: number
  rating?: number
  isAvailable?: boolean
  is_available?: boolean
  status?: string
  areaId?: string | null
  area_id?: string | null
  vehicleId?: string | null
  vehicle_id?: string | null
  vehicleType?: string
  vehicle_type?: string
  vehicleModel?: string
  vehiclePlat?: string
  vehicle_plat?: string
  plateNumber?: string
}

export interface UpdateDriverInput {
  fullName?: string
  name?: string
  phoneNumber?: string
  phone?: string
  email?: string
  photoUrl?: string
  licenseNumber?: string
  license_number?: string
  licenseExpiryDate?: string | Date | null
  license_expiry_date?: string | Date | null
  activeStartDate?: string | Date | null
  active_start_date?: string | Date | null
  activeEndDate?: string | Date | null
  active_end_date?: string | Date | null
  inactiveStartDate?: string | Date | null
  inactive_start_date?: string | Date | null
  inactiveEndDate?: string | Date | null
  inactive_end_date?: string | Date | null
  experienceYears?: number
  experience_years?: number
  rating?: number
  isAvailable?: boolean
  is_available?: boolean
  status?: string
  areaId?: string | null
  area_id?: string | null
  vehicleId?: string | null
  vehicle_id?: string | null
}

export interface AssignVehicleToDriverInput {
  vehicleId?: string | null
  vehicle_id?: string | null
}

export interface DriverFilterInput {
  isAvailable?: boolean
  is_available?: boolean
  status?: string
  areaId?: string
  area_id?: string
  area?: string
  search?: string
  date?: string | Date
  tripId?: string
  trip_id?: string
}

