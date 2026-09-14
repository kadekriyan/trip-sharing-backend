export interface CreateVehicleInput {
  name: string
  plateNumber?: string
  plate_number?: string
  vehicleType?: string
  vehicle_type?: string
  capacity?: number
  transmission?: string
  fuelType?: string
  fuel_type?: string
  facility?: string[] | string | Record<string, unknown>
  coverImage?: string
  cover_image?: string
  status?: string
  isAvailable?: boolean
  is_available?: boolean
  driverId?: string | null
  driver_id?: string | null
}

export interface UpdateVehicleInput {
  name?: string
  plateNumber?: string
  plate_number?: string
  vehicleType?: string
  vehicle_type?: string
  capacity?: number
  transmission?: string
  fuelType?: string
  fuel_type?: string
  facility?: string[] | string | Record<string, unknown>
  coverImage?: string
  cover_image?: string
  status?: string
  isAvailable?: boolean
  is_available?: boolean
  driverId?: string | null
  driver_id?: string | null
}

export interface AssignDriverToVehicleInput {
  driverId?: string | null
  driver_id?: string | null
}

export interface VehicleFilterInput {
  status?: string
  isAvailable?: boolean
  is_available?: boolean
  vehicleType?: string
  vehicle_type?: string
  search?: string
}
