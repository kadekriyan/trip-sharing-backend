import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export class DriverService {
  static async create(data: {
    user_id?: string
    userId?: string
    fullName?: string
    phoneNumber?: string
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
  }) {
    let userId = data.user_id || data.userId

    if (!userId && data.fullName) {
      const email = `${(data.phoneNumber || Date.now().toString()).replace(/[^0-9]/g, '')}@driver.local`
      const user = await prisma.user.create({
        data: {
          email,
          password: 'driver-default-pass',
          name: data.fullName,
          phone: data.phoneNumber,
          role: 'driver',
        },
      })
      userId = user.id
    }

    if (!userId) throw new ApiError('User ID or driver information is required', 400)

    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) throw new ApiError('User not found', 404)

    return prisma.driver.create({
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
  }

  static async list(filters: { is_available?: boolean }) {
    return prisma.driver.findMany({
      where: { ...(filters.is_available !== undefined && { is_available: filters.is_available }) },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    })
  }

  static async get(id: string) {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } })
    if (!driver) throw new ApiError('Driver not found', 404)
    return driver
  }

  static async update(id: string, data: Record<string, unknown>) {
    await this.get(id)
    return prisma.driver.update({ where: { id }, data: data as never })
  }

  static async delete(id: string) {
    await this.get(id)
    await prisma.driver.delete({ where: { id } })
  }
}
