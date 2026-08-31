import { prisma } from '../config/database'

export class UserService {
  static async getById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, role: true, profile_image_url: true },
    })
  }
}
