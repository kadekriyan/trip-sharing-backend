import { prisma } from '../config/database'
import { CreateDriverInput, DriverFilterInput, UpdateDriverInput } from '../types/driver'
import { ApiError } from '../utils/errors'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(part-|grp-|trip-|dest-|usr-|pay-|drv-|veh-|area-)/, '')
  }
  return String(val || '')
}

export function formatDriver(
  d: Record<string, unknown> & {
    user?: Record<string, unknown> | null
    vehicle?: Record<string, unknown> | null
    area?: Record<string, unknown> | null
  }
) {
  const user = d.user || {}
  const vehicle = d.vehicle || null
  const area = d.area || null
  const fullName = (user.name as string) || (d.fullName as string) || (d.name as string) || 'Driver'
  const phoneNumber =
    (user.phone as string) || (d.phoneNumber as string) || (d.phone as string) || ''
  const email = (user.email as string) || (d.email as string) || ''
  const licenseNumber = (d.license_number as string) || (d.licenseNumber as string) || ''

  // Fallback vehicle info from linked vehicle or legacy properties
  const vehicleModel =
    (vehicle?.name as string) ||
    (vehicle?.vehicle_type as string) ||
    (d.vehicle_type as string) ||
    (d.vehicleType as string) ||
    (d.vehicleModel as string) ||
    'Toyota HiAce Premio'
  const plateNumber =
    (vehicle?.plate_number as string) ||
    (d.vehicle_plat as string) ||
    (d.vehiclePlat as string) ||
    (d.plateNumber as string) ||
    ''

  const areaId = (d.area_id as string) || (d.areaId as string) || (area?.id as string) || null

  return {
    id: d.id as string,
    userId: (d.user_id as string) || (d.userId as string) || (user.id as string) || '',
    fullName,
    name: fullName,
    phoneNumber,
    phone: phoneNumber,
    email,
    licenseNumber,
    license_number: licenseNumber,
    experienceYears: (d.experience_years as number) || (d.experienceYears as number) || 1,
    experience_years: (d.experience_years as number) || (d.experienceYears as number) || 1,
    rating: d.rating ? Number(d.rating) : 5.0,
    isAvailable: d.is_available !== undefined ? (d.is_available as boolean) : true,
    is_available: d.is_available !== undefined ? (d.is_available as boolean) : true,
    status: (d.status as string) || 'active',
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
    vehicleId: vehicle ? (vehicle.id as string) : (d.vehicle_id as string) || null,
    vehicle_id: vehicle ? (vehicle.id as string) : (d.vehicle_id as string) || null,
    vehicle: vehicle
      ? {
          id: vehicle.id as string,
          name: vehicle.name as string,
          plateNumber: vehicle.plate_number as string,
          plate_number: vehicle.plate_number as string,
          vehicleType: vehicle.vehicle_type as string,
          capacity: vehicle.capacity as number,
          status: vehicle.status as string,
          isAvailable: vehicle.is_available as boolean,
        }
      : null,
    // Backward compatibility aliases
    vehicleType: vehicleModel,
    vehicleModel,
    vehicle_type: vehicleModel,
    vehiclePlat: plateNumber,
    plateNumber,
    vehicle_plat: plateNumber,
    user: {
      id: (user.id as string) || (d.user_id as string) || '',
      name: fullName,
      phone: phoneNumber,
      email,
      profileImageUrl:
        (user.profile_image_url as string) ||
        (user.avatar_url as string) ||
        (user.profileImageUrl as string) ||
        (d.photoUrl as string) ||
        '',
    },
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

export class DriverService {
  static async create(data: CreateDriverInput) {
    let userId = data.user_id || data.userId
    const name = data.fullName || data.name || 'Driver'
    const phone = data.phoneNumber || data.phone

    if (!userId && (data.fullName || data.name)) {
      const email =
        data.email ||
        `${(phone || Date.now().toString()).replace(/[^0-9]/g, '') || Date.now()}@driver.local`
      const user = await prisma.user.create({
        data: {
          email,
          password: 'driver-default-pass',
          name,
          phone,
          role: 'driver',
        },
      })
      userId = user.id
    }

    if (!userId) throw new ApiError('User ID or driver information is required', 400)

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) throw new ApiError('User not found', 404)

    const licenseNumber =
      data.license_number || data.licenseNumber || `SIM-${Math.floor(10000000 + Math.random() * 90000000)}`
    const experienceYears = Number(data.experience_years ?? data.experienceYears ?? 3)
    const isAvailable = data.is_available ?? data.isAvailable ?? true
    const status = data.status || 'active'

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

    const driver = await prisma.driver.create({
      data: {
        user_id: userId,
        license_number: licenseNumber,
        experience_years: experienceYears,
        is_available: isAvailable,
        status,
        area_id: areaId,
      },
      include: { user: true, vehicle: true, area: true },
    })

    // Handle pairing vehicle if vehicleId or legacy vehicle parameters provided
    const rawVehId = data.vehicleId || data.vehicle_id
    if (rawVehId) {
      const cleanVehId = cleanId(rawVehId)
      await prisma.vehicle.update({
        where: { id: cleanVehId },
        data: { driver_id: driver.id },
      })
    } else if (data.plateNumber || data.vehiclePlat || data.vehicle_plat) {
      const plate = (data.plateNumber || data.vehiclePlat || data.vehicle_plat)!.trim().toUpperCase()
      const existingVehicle = await prisma.vehicle.findUnique({ where: { plate_number: plate } })
      if (existingVehicle) {
        await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: { driver_id: driver.id },
        })
      } else {
        await prisma.vehicle.create({
          data: {
            name: data.vehicleModel || data.vehicleType || data.vehicle_type || 'Toyota HiAce Premio',
            plate_number: plate,
            vehicle_type: data.vehicleType || data.vehicle_type || 'Minivan',
            capacity: 6,
            driver_id: driver.id,
            area_id: areaId,
          },
        })
      }
    }

    const finalDriver = await prisma.driver.findUnique({
      where: { id: driver.id },
      include: { user: true, vehicle: true, area: true },
    })

    return formatDriver(finalDriver as never)
  }

  static async list(filters: DriverFilterInput = {}) {
    const where: Record<string, unknown> = {}

    if (filters.is_available !== undefined || filters.isAvailable !== undefined) {
      where.is_available = filters.isAvailable ?? filters.is_available
    }
    if (filters.status) {
      where.status = filters.status
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
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s, mode: 'insensitive' } } },
        { license_number: { contains: s, mode: 'insensitive' } },
        { vehicle: { plate_number: { contains: s, mode: 'insensitive' } } },
        { vehicle: { name: { contains: s, mode: 'insensitive' } } },
        { area: { name: { contains: s, mode: 'insensitive' } } },
      ]

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }]
        delete where.OR
      } else {
        where.OR = searchCondition
      }
    }

    const drivers = await prisma.driver.findMany({
      where: where as never,
      include: { user: true, vehicle: true, area: true },
      orderBy: { created_at: 'desc' },
    })

    return drivers.map((d) => formatDriver(d as never))
  }

  static async get(id: string) {
    const cleanDrvId = cleanId(id)
    const driver = await prisma.driver.findFirst({
      where: {
        OR: [
          { id: cleanDrvId },
          { id },
          { user_id: cleanDrvId },
          { license_number: id.toUpperCase() },
        ],
      },
      include: { user: true, vehicle: true, area: true },
    })

    if (!driver) throw new ApiError('Driver not found', 404)
    return formatDriver(driver as never)
  }

  static async update(id: string, data: UpdateDriverInput) {
    const cleanDrvId = cleanId(id)
    const existing = await prisma.driver.findUnique({
      where: { id: cleanDrvId },
      include: { user: true, vehicle: true, area: true },
    })
    if (!existing) throw new ApiError('Driver not found', 404)

    // Update linked user if personal info provided
    if (
      existing.user_id &&
      (data.fullName || data.name || data.phoneNumber || data.phone || data.email || data.photoUrl)
    ) {
      await prisma.user.update({
        where: { id: existing.user_id },
        data: {
          ...(data.fullName || data.name ? { name: (data.fullName || data.name) as string } : {}),
          ...(data.phoneNumber || data.phone
            ? { phone: (data.phoneNumber || data.phone) as string }
            : {}),
          ...(data.email ? { email: data.email as string } : {}),
          ...(data.photoUrl ? { profile_image_url: data.photoUrl as string } : {}),
        },
      })
    }

    const driverUpdate: Record<string, unknown> = {}
    if (data.licenseNumber !== undefined || data.license_number !== undefined) {
      driverUpdate.license_number = data.licenseNumber ?? data.license_number
    }
    if (data.experienceYears !== undefined || data.experience_years !== undefined) {
      driverUpdate.experience_years = Number(data.experienceYears ?? data.experience_years)
    }
    if (data.isAvailable !== undefined || data.is_available !== undefined) {
      driverUpdate.is_available = Boolean(data.isAvailable ?? data.is_available)
    }
    if (data.status !== undefined) {
      driverUpdate.status = data.status
    }
    if (data.rating !== undefined) {
      driverUpdate.rating = Number(data.rating)
    }

    if (data.areaId !== undefined || data.area_id !== undefined) {
      const rawAreaId = data.areaId ?? data.area_id
      if (rawAreaId) {
        const cleanAreaId = cleanId(rawAreaId)
        const area = await prisma.area.findFirst({
          where: { OR: [{ id: cleanAreaId }, { id: rawAreaId }, { slug: rawAreaId.toLowerCase() }] },
        })
        if (!area) throw new ApiError('Area / Wilayah operasional tidak ditemukan', 404)
        driverUpdate.area_id = area.id
      } else {
        driverUpdate.area_id = null
      }
    }

    if (Object.keys(driverUpdate).length > 0) {
      await prisma.driver.update({
        where: { id: cleanDrvId },
        data: driverUpdate as never,
      })
    }

    // Handle vehicle pairing update if vehicleId is specified
    if (data.vehicleId !== undefined || data.vehicle_id !== undefined) {
      const rawVehId = data.vehicleId ?? data.vehicle_id
      if (rawVehId) {
        const cleanVehId = cleanId(rawVehId)
        // Unassign driver from any other vehicle
        await prisma.vehicle.updateMany({
          where: { driver_id: cleanDrvId, id: { not: cleanVehId } },
          data: { driver_id: null },
        })
        // Assign to target vehicle
        await prisma.vehicle.update({
          where: { id: cleanVehId },
          data: { driver_id: cleanDrvId },
        })
      } else {
        // Disconnect from vehicle
        await prisma.vehicle.updateMany({
          where: { driver_id: cleanDrvId },
          data: { driver_id: null },
        })
      }
    }

    const updated = await prisma.driver.findUnique({
      where: { id: cleanDrvId },
      include: { user: true, vehicle: true, area: true },
    })

    return formatDriver(updated as never)
  }

  static async assignVehicle(driverId: string, vehicleId: string | null) {
    const cleanDrvId = cleanId(driverId)
    const driver = await prisma.driver.findUnique({ where: { id: cleanDrvId } })
    if (!driver) throw new ApiError('Driver not found', 404)

    if (vehicleId) {
      const cleanVehId = cleanId(vehicleId)
      const vehicle = await prisma.vehicle.findUnique({ where: { id: cleanVehId } })
      if (!vehicle) throw new ApiError('Armada tidak ditemukan', 404)

      // Unassign driver from existing vehicle
      await prisma.vehicle.updateMany({
        where: { driver_id: cleanDrvId, id: { not: cleanVehId } },
        data: { driver_id: null },
      })

      // Assign to this vehicle
      await prisma.vehicle.update({
        where: { id: cleanVehId },
        data: { driver_id: cleanDrvId },
      })
    } else {
      // Disconnect
      await prisma.vehicle.updateMany({
        where: { driver_id: cleanDrvId },
        data: { driver_id: null },
      })
    }

    const updated = await prisma.driver.findUnique({
      where: { id: cleanDrvId },
      include: { user: true, vehicle: true, area: true },
    })

    return formatDriver(updated as never)
  }

  static async delete(id: string) {
    const cleanDrvId = cleanId(id)
    const driver = await prisma.driver.findUnique({
      where: { id: cleanDrvId },
      include: {
        user: true,
        booking_groups: {
          where: {
            status: { in: ['open', 'waiting', 'confirmed'] },
          },
        },
      },
    })
    if (!driver) throw new ApiError('Driver not found', 404)

    if (driver.booking_groups.length > 0) {
      throw new ApiError(
        'Driver tidak dapat dihapus karena sedang ditugaskan pada grup armada aktif.',
        400
      )
    }

    if (driver.user_id) {
      const activeTrips = await prisma.trip.findMany({
        where: {
          guide_id: driver.user_id,
          status: { in: ['active', 'scheduled', 'planning'] },
        },
      })

      if (activeTrips.length > 0) {
        throw new ApiError(
          'Driver tidak dapat dihapus karena sedang ditugaskan sebagai pemandu pada jadwal trip aktif.',
          400
        )
      }
    }

    // Unassign any vehicle before deleting
    await prisma.vehicle.updateMany({
      where: { driver_id: cleanDrvId },
      data: { driver_id: null },
    })

    await prisma.driver.delete({ where: { id: cleanDrvId } })
    return { id: cleanDrvId, deleted: true }
  }
}
