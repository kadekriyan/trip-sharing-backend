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
}
