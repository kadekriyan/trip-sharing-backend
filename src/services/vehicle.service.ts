import { prisma } from '../config/database'
import { AssignDriverToVehicleInput, CreateVehicleInput, UpdateVehicleInput, VehicleFilterInput } from '../types/vehicle'
import { ApiError } from '../utils/errors'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(veh-|drv-|grp-|trip-|usr-|area-)/, '')
  }
  return String(val || '')
}

export function formatVehicle(
  v: Record<string, unknown> & {
    driver?: Record<string, unknown> | null
    area?: Record<string, unknown> | null
  }
) {
  const driver = v.driver || null
  const driverUser = driver && typeof driver === 'object' ? (driver.user as Record<string, unknown> | null) : null
  const area = v.area || null
  const areaId = (v.area_id as string) || (v.areaId as string) || (area?.id as string) || null

  return {
    id: v.id as string,
    name: v.name as string,
    plateNumber: v.plate_number as string,
    plate_number: v.plate_number as string,
    vehicleType: v.vehicle_type as string,
    vehicle_type: v.vehicle_type as string,
    capacity: (v.capacity as number) || 6,
    transmission: (v.transmission as string) || null,
    fuelType: (v.fuel_type as string) || (v.fuelType as string) || null,
    fuel_type: (v.fuel_type as string) || (v.fuelType as string) || null,
    facility: v.facility || null,
    coverImage: (v.cover_image as string) || (v.coverImage as string) || null,
    cover_image: (v.cover_image as string) || (v.coverImage as string) || null,
    status: (v.status as string) || 'active',
    isAvailable: v.is_available !== undefined ? (v.is_available as boolean) : true,
    is_available: v.is_available !== undefined ? (v.is_available as boolean) : true,
    areaId,
    area_id: areaId,
    area: area
      ? {
          id: area.id as string,
          name: area.name as string,
          slug: area.slug as string,
          city: (area.city as string) || null,
          province: (area.province as string) || null,
        }
      : null,
    driverId: (v.driver_id as string) || null,
    driver_id: (v.driver_id as string) || null,
    driver: driver
      ? {
          id: driver.id as string,
          userId: (driver.user_id as string) || (driverUser?.id as string) || '',
          fullName: (driverUser?.name as string) || (driver.fullName as string) || 'Driver',
          phoneNumber: (driverUser?.phone as string) || (driver.phoneNumber as string) || '',
          email: (driverUser?.email as string) || '',
          licenseNumber: (driver.license_number as string) || '',
          rating: driver.rating ? Number(driver.rating) : 5.0,
          isAvailable: driver.is_available !== undefined ? (driver.is_available as boolean) : true,
          status: (driver.status as string) || 'active',
          photoUrl: (driverUser?.profile_image_url as string) || null,
        }
      : null,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  }
}

export class VehicleService {
  static async create(data: CreateVehicleInput) {
    const name = data.name
    const rawPlate = data.plateNumber || data.plate_number
    if (!name || !rawPlate) {
      throw new ApiError('Nama armada dan plat nomor wajib diisi', 400)
    }

    const plateNumber = rawPlate.trim().toUpperCase()

    // Check duplicate plate
    const existingPlate = await prisma.vehicle.findUnique({
      where: { plate_number: plateNumber },
    })
    if (existingPlate) {
      throw new ApiError(`Plat nomor "${plateNumber}" sudah terdaftar dalam sistem`, 409)
    }

    let driverId: string | null = null
    const rawDriverId = data.driverId || data.driver_id
    if (rawDriverId) {
      const cleanDriverId = cleanId(rawDriverId)
      const driver = await prisma.driver.findUnique({ where: { id: cleanDriverId } })
      if (!driver) throw new ApiError('Driver not found', 404)
      driverId = cleanDriverId
    }

    let areaId: string | null = null
    const rawAreaId = data.areaId || data.area_id
    if (rawAreaId) {
      const cleanAreaId = cleanId(rawAreaId)
      const existingArea = await prisma.area.findFirst({
        where: { OR: [{ id: cleanAreaId }, { id: rawAreaId }, { slug: rawAreaId.toLowerCase() }] },
      })
      if (!existingArea) throw new ApiError('Area / Wilayah operasional tidak ditemukan', 404)
      areaId = existingArea.id
    }

    const vehicleType = data.vehicleType || data.vehicle_type || 'Minivan'
    const capacity = data.capacity || 6
    const transmission = data.transmission || 'Manual'
    const fuelType = data.fuelType || data.fuel_type || 'Diesel'
    const facility = data.facility || ['AC', 'Audio/Radio', 'Reclining Seat', 'USB Charger']
    const coverImage = data.coverImage || data.cover_image || null
    const status = data.status || 'active'
    const isAvailable = data.isAvailable ?? data.is_available ?? true

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        plate_number: plateNumber,
        vehicle_type: vehicleType,
        capacity,
        transmission,
        fuel_type: fuelType,
        facility: facility as never,
        cover_image: coverImage,
        status,
        is_available: isAvailable,
        driver_id: driverId,
        area_id: areaId,
      },
      include: {
        driver: {
          include: { user: true },
        },
        area: true,
      },
    })

    return formatVehicle(vehicle as never)
  }

  static async list(filters: VehicleFilterInput = {}) {
    const where: Record<string, unknown> = {}

    if (filters.status) {
      where.status = filters.status
    }
    if (filters.isAvailable !== undefined || filters.is_available !== undefined) {
      where.is_available = filters.isAvailable ?? filters.is_available
    }
    if (filters.vehicleType || filters.vehicle_type) {
      where.vehicle_type = filters.vehicleType || filters.vehicle_type
    }

    // Filter by Area
    const rawArea = filters.areaId || filters.area_id || filters.area
    if (rawArea) {
      const cleanAreaId = cleanId(rawArea)
      where.OR = [
        { area_id: cleanAreaId },
        { area_id: rawArea },
        { area: { slug: rawArea.toLowerCase().trim() } },
        { area: { name: { contains: rawArea.trim(), mode: 'insensitive' } } },
      ]
    }

    if (filters.search) {
      const s = filters.search.trim()
      const searchCondition = [
        { name: { contains: s, mode: 'insensitive' } },
        { plate_number: { contains: s, mode: 'insensitive' } },
        { vehicle_type: { contains: s, mode: 'insensitive' } },
        { driver: { user: { name: { contains: s, mode: 'insensitive' } } } },
        { area: { name: { contains: s, mode: 'insensitive' } } },
      ]

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }]
        delete where.OR
      } else {
        where.OR = searchCondition
      }
    }

    const vehicles = await prisma.vehicle.findMany({
      where: where as never,
      include: {
        driver: {
          include: { user: true },
        },
        area: true,
      },
      orderBy: { created_at: 'desc' },
    })

    return vehicles.map((v) => formatVehicle(v as never))
  }

  static async get(id: string) {
    const cleanVehId = cleanId(id)
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { id: cleanVehId },
          { id },
          { plate_number: id.toUpperCase() },
          { plate_number: cleanVehId.toUpperCase() },
        ],
      },
      include: {
        driver: {
          include: { user: true },
        },
        area: true,
        booking_groups: {
          include: {
            trip: {
              include: { destination: true },
            },
          },
        },
      },
    })

    if (!vehicle) throw new ApiError('Armada / Kendaraan tidak ditemukan', 404)
    return formatVehicle(vehicle as never)
  }

  static async update(id: string, data: UpdateVehicleInput) {
    const cleanVehId = cleanId(id)
    const existing = await prisma.vehicle.findUnique({
      where: { id: cleanVehId },
      include: { driver: true, area: true },
    })
    if (!existing) throw new ApiError('Armada / Kendaraan tidak ditemukan', 404)

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }
    if (data.plateNumber !== undefined || data.plate_number !== undefined) {
      const newPlate = (data.plateNumber ?? data.plate_number)!.trim().toUpperCase()
      if (newPlate !== existing.plate_number) {
        const dup = await prisma.vehicle.findUnique({ where: { plate_number: newPlate } })
        if (dup) throw new ApiError(`Plat nomor "${newPlate}" sudah digunakan armada lain`, 409)
        updateData.plate_number = newPlate
      }
    }
    if (data.vehicleType !== undefined || data.vehicle_type !== undefined) {
      updateData.vehicle_type = data.vehicleType ?? data.vehicle_type
    }
    if (data.capacity !== undefined) {
      updateData.capacity = Number(data.capacity)
    }
    if (data.transmission !== undefined) {
      updateData.transmission = data.transmission
    }
    if (data.fuelType !== undefined || data.fuel_type !== undefined) {
      updateData.fuel_type = data.fuelType ?? data.fuel_type
    }
    if (data.facility !== undefined) {
      updateData.facility = data.facility
    }
    if (data.coverImage !== undefined || data.cover_image !== undefined) {
      updateData.cover_image = data.coverImage ?? data.cover_image
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.isAvailable !== undefined || data.is_available !== undefined) {
      updateData.is_available = Boolean(data.isAvailable ?? data.is_available)
    }

    if (data.areaId !== undefined || data.area_id !== undefined) {
      const rawAreaId = data.areaId ?? data.area_id
      if (rawAreaId) {
        const cleanAreaId = cleanId(rawAreaId)
        const area = await prisma.area.findFirst({
          where: { OR: [{ id: cleanAreaId }, { id: rawAreaId }, { slug: rawAreaId.toLowerCase() }] },
        })
        if (!area) throw new ApiError('Area / Wilayah operasional tidak ditemukan', 404)
        updateData.area_id = area.id
      } else {
        updateData.area_id = null
      }
    }

    if (data.driverId !== undefined || data.driver_id !== undefined) {
      const rawDriverId = data.driverId ?? data.driver_id
      if (rawDriverId) {
        const cleanDriverId = cleanId(rawDriverId)
        const driver = await prisma.driver.findUnique({ where: { id: cleanDriverId } })
        if (!driver) throw new ApiError('Driver not found', 404)
        updateData.driver_id = cleanDriverId
      } else {
        updateData.driver_id = null
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id: cleanVehId },
      data: updateData as never,
      include: {
        driver: {
          include: { user: true },
        },
        area: true,
      },
    })

    return formatVehicle(updated as never)
  }

  static async assignDriver(vehicleId: string, input: AssignDriverToVehicleInput) {
    const cleanVehId = cleanId(vehicleId)
    const existing = await prisma.vehicle.findUnique({
      where: { id: cleanVehId },
      include: { driver: { include: { user: true } }, area: true },
    })
    if (!existing) throw new ApiError('Armada / Kendaraan tidak ditemukan', 404)

    const rawDriverId = input.driverId ?? input.driver_id
    let newDriverId: string | null = null

    if (rawDriverId) {
      const cleanDriverId = cleanId(rawDriverId)
      const driver = await prisma.driver.findUnique({ where: { id: cleanDriverId } })
      if (!driver) throw new ApiError('Driver not found', 404)

      // If driver is currently attached to another vehicle, unassign them first
      await prisma.vehicle.updateMany({
        where: { driver_id: cleanDriverId, id: { not: cleanVehId } },
        data: { driver_id: null },
      })

      newDriverId = cleanDriverId
    }

    const updated = await prisma.vehicle.update({
      where: { id: cleanVehId },
      data: { driver_id: newDriverId },
      include: {
        driver: {
          include: { user: true },
        },
        area: true,
      },
    })

    return formatVehicle(updated as never)
  }

  static async delete(id: string) {
    const cleanVehId = cleanId(id)
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: cleanVehId },
      include: {
        booking_groups: {
          where: {
            status: { in: ['open', 'waiting', 'confirmed'] },
          },
        },
      },
    })
    if (!vehicle) throw new ApiError('Armada / Kendaraan tidak ditemukan', 404)

    const activeGroups = (vehicle as { booking_groups?: Array<unknown> }).booking_groups || []
    if (activeGroups.length > 0) {
      throw new ApiError(
        'Armada tidak dapat dihapus karena sedang ditugaskan pada grup perjalanan aktif.',
        400
      )
    }

    await prisma.vehicle.delete({ where: { id: cleanVehId } })
    return { id: cleanVehId, deleted: true }
  }
}
