import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export class DriverService {
  static async create(data: {
    user_id: number
    license_number: string
    vehicle_type: string
    vehicle_plat: string
    experience_years: number
    is_available?: boolean
  }) {
    const user = await prisma.user.findUnique({ where: { id: data.user_id } })
    if (!user) throw new ApiError('User not found', 404)

    return prisma.driver.create({ data })
  }

  static async list(filters: { is_available?: boolean }) {
    return prisma.driver.findMany({
      where: { ...(filters.is_available !== undefined && { is_available: filters.is_available }) },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    })
  }

  static async get(id: number) {
    const driver = await prisma.driver.findUnique({ where: { id }, include: { user: true } })
    if (!driver) throw new ApiError('Driver not found', 404)
    return driver
  }

  static async update(id: number, data: Record<string, unknown>) {
    await this.get(id)
    return prisma.driver.update({ where: { id }, data: data as never })
  }

  static async delete(id: number) {
    await this.get(id)
    await prisma.driver.delete({ where: { id } })
  }
}
