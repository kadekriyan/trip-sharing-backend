import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

function formatDriver(d: Record<string, unknown> & { user?: Record<string, unknown> | null }) {
  const user = d.user || {}
  const fullName = (user.name as string) || (d.fullName as string) || (d.name as string) || 'Driver'
  const phoneNumber =
    (user.phone as string) || (d.phoneNumber as string) || (d.phone as string) || ''
  const email = (user.email as string) || (d.email as string) || ''
  const vehicleModel =
    (d.vehicle_type as string) ||
    (d.vehicleType as string) ||
    (d.vehicleModel as string) ||
    'Toyota HiAce Premio'
  const plateNumber =
    (d.vehicle_plat as string) || (d.vehiclePlat as string) || (d.plateNumber as string) || ''
  const licenseNumber = (d.license_number as string) || (d.licenseNumber as string) || ''

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
    vehicleType: vehicleModel,
    vehicleModel,
    vehicle_type: vehicleModel,
    vehiclePlat: plateNumber,
    plateNumber,
    vehicle_plat: plateNumber,
    experienceYears: (d.experience_years as number) || (d.experienceYears as number) || 1,
    experience_years: (d.experience_years as number) || (d.experienceYears as number) || 1,
    rating: d.rating ? Number(d.rating) : 5.0,
    isAvailable: d.is_available !== undefined ? (d.is_available as boolean) : true,
    is_available: d.is_available !== undefined ? (d.is_available as boolean) : true,
    user: {
      id: (user.id as string) || (d.user_id as string) || '',
      name: fullName,
      phone: phoneNumber,
      email,
      profileImageUrl:
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
  static async create(data: {
    user_id?: string
    userId?: string
    fullName?: string
    name?: string
    phoneNumber?: string
    phone?: string
    email?: string
    license_number?: string
    licenseNumber?: string
    vehicle_type?: string
    vehicleType?: string
    vehicleModel?: string
    vehicle_plat?: string
    vehiclePlat?: string
    plateNumber?: string
    experience_years?: number
    experienceYears?: number
    is_available?: boolean
    isAvailable?: boolean
    rating?: number
  }) {
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

    const driver = await prisma.driver.create({
      data: {
        user_id: userId,
        license_number: data.license_number || data.licenseNumber || `SIM-${Date.now()}`,
        vehicle_type:
          data.vehicle_type || data.vehicleType || data.vehicleModel || 'Toyota HiAce Premio',
        vehicle_plat:
          data.vehicle_plat ||
          data.vehiclePlat ||
          data.plateNumber ||
          `B ${Math.floor(1000 + Math.random() * 9000)} TST`,
        experience_years: data.experience_years ?? data.experienceYears ?? 3,
        is_available: data.is_available ?? data.isAvailable ?? true,
      },
      include: { user: true },
    })

    return formatDriver(
      driver as unknown as Record<string, unknown> & { user?: Record<string, unknown> }
    )
  }

  static async list(filters: { is_available?: boolean } = {}) {
    const drivers = await prisma.driver.findMany({
      where: { ...(filters.is_available !== undefined && { is_available: filters.is_available }) },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    })
    return drivers.map((d) =>
      formatDriver(d as unknown as Record<string, unknown> & { user?: Record<string, unknown> })
    )
  }

  static async get(id: string) {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } })
    if (!driver) throw new ApiError('Driver not found', 404)
    return formatDriver(
      driver as unknown as Record<string, unknown> & { user?: Record<string, unknown> }
    )
  }

  static async update(id: string, data: Record<string, unknown>) {
    const existing = await prisma.driver.findUnique({ where: { id }, include: { user: true } })
    if (!existing) throw new ApiError('Driver not found', 404)

    // Update linked user if name or phone or email changed
    if (
      existing.user_id &&
      (data.fullName || data.name || data.phoneNumber || data.phone || data.email)
    ) {
      await prisma.user.update({
        where: { id: existing.user_id },
        data: {
          ...(data.fullName || data.name ? { name: (data.fullName || data.name) as string } : {}),
          ...(data.phoneNumber || data.phone
            ? { phone: (data.phoneNumber || data.phone) as string }
            : {}),
          ...(data.email ? { email: data.email as string } : {}),
        },
      })
    }

    const driverUpdate: Record<string, unknown> = {}
    if (data.licenseNumber !== undefined || data.license_number !== undefined) {
      driverUpdate.license_number = data.licenseNumber ?? data.license_number
    }
    if (
      data.vehicleModel !== undefined ||
      data.vehicleType !== undefined ||
      data.vehicle_type !== undefined
    ) {
      driverUpdate.vehicle_type = data.vehicleModel ?? data.vehicleType ?? data.vehicle_type
    }
    if (
      data.plateNumber !== undefined ||
      data.vehiclePlat !== undefined ||
      data.vehicle_plat !== undefined
    ) {
      driverUpdate.vehicle_plat = data.plateNumber ?? data.vehiclePlat ?? data.vehicle_plat
    }
    if (data.experienceYears !== undefined || data.experience_years !== undefined) {
      driverUpdate.experience_years = Number(data.experienceYears ?? data.experience_years)
    }
    if (data.isAvailable !== undefined || data.is_available !== undefined) {
      driverUpdate.is_available = Boolean(data.isAvailable ?? data.is_available)
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: driverUpdate as never,
      include: { user: true },
    })

    return formatDriver(
      updated as unknown as Record<string, unknown> & { user?: Record<string, unknown> }
    )
  }

  static async delete(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!driver) throw new ApiError('Driver not found', 404)

    // Check if driver is assigned to active trips
    if (driver.user_id) {
      const activeTrips = await prisma.trip.findMany({
        where: {
          guide_id: driver.user_id,
          status: { in: ['active', 'scheduled', 'planning'] },
        },
      })

      if (activeTrips.length > 0) {
        throw new ApiError(
          'Driver tidak dapat dihapus karena sedang ditugaskan pada jadwal trip aktif.',
          400
        )
      }
    }

    await prisma.driver.delete({ where: { id } })
  }
}
