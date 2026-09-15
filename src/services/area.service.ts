import { prisma } from '../config/database'
import { AreaFilterInput, AreaResponse, CreateAreaInput, UpdateAreaInput } from '../types/area'
import { ApiError } from '../utils/errors'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(area-|drv-|veh-|grp-|trip-|usr-)/, '')
  }
  return String(val || '')
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizeText(str?: string | null): string | null {
  if (!str) return null
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export function formatArea(
  a: Record<string, unknown> & {
    _count?: { drivers?: number; vehicles?: number }
    drivers?: unknown[]
    vehicles?: unknown[]
  }
): AreaResponse {
  const driversCount =
    a._count?.drivers ?? (Array.isArray(a.drivers) ? a.drivers.length : undefined)
  const vehiclesCount =
    a._count?.vehicles ?? (Array.isArray(a.vehicles) ? a.vehicles.length : undefined)

  return {
    id: a.id as string,
    name: a.name as string,
    slug: a.slug as string,
    city: (a.city as string) || null,
    province: (a.province as string) || null,
    description: (a.description as string) || null,
    isActive: a.is_active !== undefined ? (a.is_active as boolean) : true,
    is_active: a.is_active !== undefined ? (a.is_active as boolean) : true,
    ...(driversCount !== undefined ? { driversCount } : {}),
    ...(vehiclesCount !== undefined ? { vehiclesCount } : {}),
    createdAt: a.created_at as Date | string,
    updatedAt: a.updated_at as Date | string,
  }
}

export class AreaService {
  static async create(data: CreateAreaInput): Promise<AreaResponse> {
    const rawName = sanitizeText(data.name)
    if (!rawName || rawName.length < 2) {
      throw new ApiError('Nama area wajib diisi minimal 2 karakter', 400)
    }

    const name = rawName
    let slug = data.slug ? generateSlug(data.slug) : generateSlug(name)
    if (!slug) slug = generateSlug(name) || `area-${Date.now()}`

    // Check duplicate name
    const existingName = await prisma.area.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (existingName) {
      throw new ApiError(`Area dengan nama "${name}" sudah terdaftar`, 409)
    }

    // Check duplicate slug
    const existingSlug = await prisma.area.findUnique({
      where: { slug },
    })
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
    }

    const city = sanitizeText(data.city)
    const province = sanitizeText(data.province)
    const description = sanitizeText(data.description)
    const isActive = data.isActive ?? data.is_active ?? true

    const area = await prisma.area.create({
      data: {
        name,
        slug,
        city,
        province,
        description,
        is_active: isActive,
      },
      include: {
        _count: {
          select: { drivers: true, vehicles: true },
        },
      },
    })

    return formatArea(area as never)
  }

  static async list(filters: AreaFilterInput = {}): Promise<AreaResponse[]> {
    const where: Record<string, unknown> = {}

    if (filters.isActive !== undefined || filters.is_active !== undefined) {
      where.is_active = filters.isActive ?? filters.is_active
    }
    if (filters.city) {
      where.city = { contains: filters.city.trim(), mode: 'insensitive' }
    }
    if (filters.province) {
      where.province = { contains: filters.province.trim(), mode: 'insensitive' }
    }
    if (filters.search) {
      const s = filters.search.trim()
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { province: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ]
    }

    const areas = await prisma.area.findMany({
      where: where as never,
      include: {
        _count: {
          select: { drivers: true, vehicles: true },
        },
      },
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    })

    return areas.map((a) => formatArea(a as never))
  }

  static async get(idOrSlug: string): Promise<AreaResponse> {
    const clean = cleanId(idOrSlug)
    const area = await prisma.area.findFirst({
      where: {
        OR: [{ id: clean }, { id: idOrSlug }, { slug: idOrSlug.toLowerCase().trim() }],
      },
      include: {
        _count: {
          select: { drivers: true, vehicles: true },
        },
      },
    })

    if (!area) {
      throw new ApiError('Area / Wilayah operasional tidak ditemukan', 404)
    }

    return formatArea(area as never)
  }

  static async update(idOrSlug: string, data: UpdateAreaInput): Promise<AreaResponse> {
    const clean = cleanId(idOrSlug)
    const existing = await prisma.area.findFirst({
      where: {
        OR: [{ id: clean }, { id: idOrSlug }, { slug: idOrSlug.toLowerCase().trim() }],
      },
    })

    if (!existing) {
      throw new ApiError('Area / Wilayah operasional tidak ditemukan', 404)
    }

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      const sanitizedName = sanitizeText(data.name)
      if (!sanitizedName || sanitizedName.length < 2) {
        throw new ApiError('Nama area wajib diisi minimal 2 karakter', 400)
      }
      if (sanitizedName.toLowerCase() !== existing.name.toLowerCase()) {
        const dupName = await prisma.area.findFirst({
          where: {
            name: { equals: sanitizedName, mode: 'insensitive' },
            id: { not: existing.id },
          },
        })
        if (dupName) {
          throw new ApiError(`Area dengan nama "${sanitizedName}" sudah terdaftar`, 409)
        }
      }
      updateData.name = sanitizedName
    }

    if (data.slug !== undefined) {
      const customSlug = generateSlug(data.slug)
      if (customSlug && customSlug !== existing.slug) {
        const dupSlug = await prisma.area.findFirst({
          where: {
            slug: customSlug,
            id: { not: existing.id },
          },
        })
        if (dupSlug) {
          throw new ApiError(`Slug "${customSlug}" sudah digunakan oleh area lain`, 409)
        }
        updateData.slug = customSlug
      }
    } else if (data.name && updateData.name) {
      // Auto-update slug if name changes and slug not explicitly given
      const autoSlug = generateSlug(updateData.name as string)
      const dupSlug = await prisma.area.findFirst({
        where: {
          slug: autoSlug,
          id: { not: existing.id },
        },
      })
      if (!dupSlug) {
        updateData.slug = autoSlug
      }
    }

    if (data.city !== undefined) {
      updateData.city = sanitizeText(data.city)
    }
    if (data.province !== undefined) {
      updateData.province = sanitizeText(data.province)
    }
    if (data.description !== undefined) {
      updateData.description = sanitizeText(data.description)
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      updateData.is_active = data.isActive ?? data.is_active
    }

    const updated = await prisma.area.update({
      where: { id: existing.id },
      data: updateData as never,
      include: {
        _count: {
          select: { drivers: true, vehicles: true },
        },
      },
    })

    return formatArea(updated as never)
  }

  static async delete(idOrSlug: string): Promise<{ id: string; deleted: boolean }> {
    const clean = cleanId(idOrSlug)
    const existing = await prisma.area.findFirst({
      where: {
        OR: [{ id: clean }, { id: idOrSlug }, { slug: idOrSlug.toLowerCase().trim() }],
      },
      include: {
        _count: {
          select: { drivers: true, vehicles: true },
        },
      },
    })

    if (!existing) {
      throw new ApiError('Area / Wilayah operasional tidak ditemukan', 404)
    }

    // Safely unassign drivers and vehicles from this area before deleting
    await prisma.driver.updateMany({
      where: { area_id: existing.id },
      data: { area_id: null },
    })

    await prisma.vehicle.updateMany({
      where: { area_id: existing.id },
      data: { area_id: null },
    })

    await prisma.area.delete({
      where: { id: existing.id },
    })

    return { id: existing.id, deleted: true }
  }
}
