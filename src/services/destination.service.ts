import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'

export interface DestinationQueryFilters {
  search?: string
  location?: string
  duration?: number
  sortBy?: 'popular' | 'price_asc' | 'price_desc' | 'rating'
  page?: number
  limit?: number
}

function formatDestination(dest: Record<string, unknown>) {
  return {
    id: `dest-${dest.id}`,
    numericId: dest.id,
    title: dest.name,
    name: dest.name,
    slug: dest.slug || `destination-${dest.id}`,
    tagline: dest.tagline || dest.description || '',
    description: dest.description || '',
    location: dest.location || '',
    durationDays: dest.duration_days || 1,
    durationNights: dest.duration_nights || 0,
    pricePerPax: dest.price_per_person ? Number(dest.price_per_person) : 0,
    price_per_person: dest.price_per_person,
    coverImage: dest.cover_image || dest.image_url || '',
    imageUrl: dest.image_url || dest.cover_image || '',
    galleryImages: dest.gallery_images || [],
    inclusions: dest.inclusions || [],
    exclusions: dest.exclusions || [],
    highlights: dest.highlights || [],
    rating: dest.rating ? Number(dest.rating) : 4.9,
    totalReviews: dest.total_reviews || 0,
    isPopular: dest.is_popular || false,
    meetingPoint: dest.meeting_point || '',
    maxGroupCapacity: dest.max_group_capacity || 6,
    itinerary: dest.itinerary || [],
    isActive: dest.is_active,
    createdAt: dest.created_at,
    updatedAt: dest.updated_at,
  }
}

export class DestinationService {
  static async create(data: {
    name?: string
    title?: string
    slug?: string
    tagline?: string
    description?: string
    image_url?: string
    coverImage?: string
    cover_image?: string
    location?: string
    price_per_person?: number
    pricePerPax?: number
    duration_days?: number
    durationDays?: number
    duration_nights?: number
    durationNights?: number
    galleryImages?: Prisma.InputJsonValue
    gallery_images?: Prisma.InputJsonValue
    inclusions?: Prisma.InputJsonValue
    exclusions?: Prisma.InputJsonValue
    highlights?: Prisma.InputJsonValue
    rating?: number
    totalReviews?: number
    isPopular?: boolean
    is_popular?: boolean
    meetingPoint?: string
    meeting_point?: string
    maxGroupCapacity?: number
    max_group_capacity?: number
    itinerary?: Prisma.InputJsonValue
    is_active?: boolean
  }) {
    const name = data.name || data.title || 'Untitled Destination'
    const slug =
      data.slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    const price = data.price_per_person ?? data.pricePerPax ?? 0
    const coverImage = data.cover_image || data.coverImage || data.image_url || null

    return prisma.destination.create({
      data: {
        name,
        slug,
        tagline: data.tagline,
        description: data.description,
        image_url: coverImage,
        cover_image: coverImage,
        location: data.location,
        price_per_person: new Prisma.Decimal(price.toString()),
        duration_days: data.duration_days ?? data.durationDays ?? 1,
        duration_nights: data.duration_nights ?? data.durationNights ?? 0,
        gallery_images: (data.gallery_images ?? data.galleryImages ?? []) as Prisma.InputJsonValue,
        inclusions: (data.inclusions ?? []) as Prisma.InputJsonValue,
        exclusions: (data.exclusions ?? []) as Prisma.InputJsonValue,
        highlights: (data.highlights ?? []) as Prisma.InputJsonValue,
        rating: data.rating
          ? new Prisma.Decimal(data.rating.toString())
          : new Prisma.Decimal('4.9'),
        total_reviews: data.totalReviews ?? 0,
        is_popular: data.is_popular ?? data.isPopular ?? false,
        meeting_point: data.meeting_point ?? data.meetingPoint ?? null,
        max_group_capacity: data.max_group_capacity ?? data.maxGroupCapacity ?? 6,
        itinerary: (data.itinerary ?? []) as Prisma.InputJsonValue,
        is_active: data.is_active ?? true,
      },
    })
  }

  static async list(filters: DestinationQueryFilters = {}) {
    const page = filters.page && filters.page > 0 ? Number(filters.page) : 1
    const limit = filters.limit && filters.limit > 0 ? Number(filters.limit) : 10
    const skip = (page - 1) * limit

    const where: Prisma.DestinationWhereInput = {
      is_active: true,
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { location: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.location && {
        location: { contains: filters.location, mode: 'insensitive' },
      }),
      ...(filters.duration && {
        duration_days: Number(filters.duration),
      }),
    }

    let orderBy: Prisma.DestinationOrderByWithRelationInput = { created_at: 'desc' }
    if (filters.sortBy === 'price_asc') {
      orderBy = { price_per_person: 'asc' }
    } else if (filters.sortBy === 'price_desc') {
      orderBy = { price_per_person: 'desc' }
    } else if (filters.sortBy === 'rating') {
      orderBy = { rating: 'desc' }
    } else if (filters.sortBy === 'popular') {
      orderBy = { total_reviews: 'desc' }
    }

    const [total, destinations] = await Promise.all([
      prisma.destination.count({ where }),
      prisma.destination.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ])

    return {
      data: destinations.map((d) => formatDestination(d as unknown as Record<string, unknown>)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  static adminList(filters: { is_active?: boolean }) {
    return prisma.destination.findMany({
      where: { ...(filters.is_active !== undefined && { is_active: filters.is_active }) },
      orderBy: { created_at: 'desc' },
    })
  }

  static async get(id: number) {
    const dest = await prisma.destination.findUnique({
      where: { id },
      include: {
        trips: {
          include: {
            booking_groups: {
              include: {
                participants: true,
              },
            },
          },
        },
      },
    })
    if (!dest) throw new ApiError('Destination not found', 404)
    return formatDestination(dest as unknown as Record<string, unknown>)
  }

  static async getBySlug(slug: string) {
    // Try finding by slug first, then fallback to numeric id
    let dest = await prisma.destination.findUnique({
      where: { slug },
      include: {
        trips: {
          where: { status: { in: ['active', 'scheduled', 'planning'] } },
          include: {
            booking_groups: {
              include: {
                participants: true,
              },
            },
            guide: {
              include: {
                driver: true,
              },
            },
          },
        },
      },
    })

    if (!dest) {
      const numericId = parseInt(slug.replace(/^\D+/g, ''), 10)
      if (!isNaN(numericId)) {
        dest = await prisma.destination.findUnique({
          where: { id: numericId },
          include: {
            trips: {
              where: { status: { in: ['active', 'scheduled', 'planning'] } },
              include: {
                booking_groups: {
                  include: {
                    participants: true,
                  },
                },
                guide: {
                  include: {
                    driver: true,
                  },
                },
              },
            },
          },
        })
      }
    }

    if (!dest) throw new ApiError('Destination not found', 404)

    const formatted = formatDestination(dest as unknown as Record<string, unknown>)
    const activeTrips = (dest.trips || []).map((t) => ({
      id: `trip-${t.id}`,
      departureDate: t.departure_date,
      returnDate: t.return_date,
      pricePerPax: Number(dest!.price_per_person),
      status: t.status,
      groups: (t.booking_groups || []).map((g) => ({
        id: `grp-${g.id}`,
        groupNumber: g.group_number,
        capacity: g.max_participants,
        currentParticipants: g.current_participants,
        status: g.status,
        driver: t.guide?.driver
          ? {
              id: `drv-${t.guide.driver.id}`,
              fullName: t.guide.name,
              vehicleModel: t.guide.driver.vehicle_type,
              plateNumber: t.guide.driver.vehicle_plat,
            }
          : {
              id: 'drv-01',
              fullName: 'Budi Santoso',
              vehicleModel: 'Toyota HiAce Commuter',
              plateNumber: 'N 1234 XY',
            },
      })),
    }))

    return {
      ...formatted,
      activeTrips,
    }
  }

  static async update(id: number, data: Record<string, unknown>) {
    const destination = await prisma.destination.findUnique({ where: { id } })
    if (!destination) throw new ApiError('Destination not found', 404)

    return prisma.destination.update({ where: { id }, data: data as never })
  }

  static async delete(id: number) {
    const destination = await prisma.destination.findUnique({
      where: { id },
      include: { trips: true },
    })
    if (!destination) throw new ApiError('Destination not found', 404)
    if (destination.trips.length > 0)
      throw new ApiError('Destination has trips and cannot be deleted', 400)

    await prisma.destination.delete({ where: { id } })
  }
}
