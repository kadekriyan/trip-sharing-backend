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
  areaId?: string | null
  area_id?: string | null
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
  areaId?: string | null
  area_id?: string | null
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
  areaId?: string
  area_id?: string
  area?: string
  search?: string
}
