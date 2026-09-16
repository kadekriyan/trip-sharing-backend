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
  const name = (dest.name as string) || (dest.title as string) || ''
  return {
    id: dest.id as string,
    title: name,
    name,
    slug: (dest.slug as string) || `destination-${dest.id}`,
    tagline: (dest.tagline as string) || (dest.description as string) || '',
    description: (dest.description as string) || '',
    location: (dest.location as string) || '',
    durationDays: (dest.duration_days as number) || 1,
    durationNights: (dest.duration_nights as number) || 0,
    pricePerPax: dest.price_per_person ? Number(dest.price_per_person) : 0,
    price_per_person: dest.price_per_person,
    coverImage: (dest.cover_image as string) || (dest.image_url as string) || '',
    imageUrl: (dest.image_url as string) || (dest.cover_image as string) || '',
    galleryImages: (dest.gallery_images as string[]) || [],
    inclusions: (dest.inclusions as string[]) || [],
    exclusions: (dest.exclusions as string[]) || [],
    highlights: (dest.highlights as string[]) || [],
    rating: dest.rating ? Number(dest.rating) : 4.9,
    totalReviews: (dest.total_reviews as number) || 0,
    isPopular: (dest.is_popular as boolean) || false,
    meetingPoint: (dest.meeting_point as string) || '',
    maxGroupCapacity: (dest.max_group_capacity as number) || 6,
    itinerary: (dest.itinerary as unknown[]) || [],
    seoTitle: (dest.seo_title as string) || (dest.seoTitle as string) || '',
    seo_title: (dest.seo_title as string) || (dest.seoTitle as string) || '',
    seoDescription: (dest.seo_description as string) || (dest.seoDescription as string) || '',
    seo_description: (dest.seo_description as string) || (dest.seoDescription as string) || '',
    seoKeywords: dest.seo_keywords || dest.seoKeywords || [],
    seo_keywords: dest.seo_keywords || dest.seoKeywords || [],
    seoOgImage: (dest.seo_og_image as string) || (dest.seoOgImage as string) || '',
    seo_og_image: (dest.seo_og_image as string) || (dest.seoOgImage as string) || '',
    customSchemaJson:
      (dest.custom_schema_json as string) || (dest.customSchemaJson as string) || null,
    custom_schema_json:
      (dest.custom_schema_json as string) || (dest.customSchemaJson as string) || null,
    noIndex: dest.no_index !== undefined ? Boolean(dest.no_index) : Boolean(dest.noIndex),
    no_index: dest.no_index !== undefined ? Boolean(dest.no_index) : Boolean(dest.noIndex),
    isActive: dest.is_active !== undefined ? (dest.is_active as boolean) : true,
    createdAt: dest.created_at,
    updatedAt: dest.updated_at,
  }
}

export class DestinationService {
  static async generateUniqueSlug(baseText: string, currentId?: string): Promise<string> {
    const rawSlug =
      baseText
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'destination'

    let slug = rawSlug
    let counter = 1
    let isUnique = false

    while (!isUnique) {
      const existing = await prisma.destination.findUnique({
        where: { slug },
        select: { id: true },
      })

      if (!existing || (currentId && existing.id === currentId)) {
        isUnique = true
        return slug
      }

      slug = `${rawSlug}-${counter}`
      counter++
    }

    return slug
  }

  static async createDestination(data: {
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
    seo_title?: string
    seoTitle?: string
    seo_description?: string
    seoDescription?: string
    seo_keywords?: Prisma.InputJsonValue
    seoKeywords?: Prisma.InputJsonValue
    seo_og_image?: string
    seoOgImage?: string
    custom_schema_json?: string
    customSchemaJson?: string
    no_index?: boolean
    noIndex?: boolean
    is_active?: boolean
  }) {
    const name = data.name || data.title || 'Untitled Destination'
    const candidateSlug = (data.slug as string) || name
    const slug = await this.generateUniqueSlug(candidateSlug)
    const price = data.price_per_person ?? data.pricePerPax ?? 0
    const coverImage = data.cover_image || data.coverImage || data.image_url || null

    const seoKeywords = data.seo_keywords ?? data.seoKeywords
    let parsedKeywords: Prisma.InputJsonValue | undefined = undefined
    if (seoKeywords !== undefined) {
      if (Array.isArray(seoKeywords)) {
        parsedKeywords = seoKeywords as Prisma.InputJsonValue
      } else if (typeof seoKeywords === 'string') {
        try {
          const parsed = JSON.parse(seoKeywords)
          parsedKeywords = (Array.isArray(parsed) ? parsed : [seoKeywords]) as Prisma.InputJsonValue
        } catch {
          parsedKeywords = [seoKeywords] as Prisma.InputJsonValue
        }
      }
    }

    const created = await prisma.destination.create({
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
        seo_title: data.seo_title || data.seoTitle || null,
        seo_description: data.seo_description || data.seoDescription || null,
        seo_keywords: parsedKeywords ?? ([] as Prisma.InputJsonValue),
        seo_og_image: data.seo_og_image || data.seoOgImage || null,
        custom_schema_json: data.custom_schema_json || data.customSchemaJson || null,
        no_index: Boolean(data.no_index ?? data.noIndex ?? false),
        is_active: data.is_active ?? true,
      },
    })

    return formatDestination(created as unknown as Record<string, unknown>)
  }

  static create = DestinationService.createDestination

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

  static async adminList(filters: { is_active?: boolean } = {}) {
    const destinations = await prisma.destination.findMany({
      where: { ...(filters.is_active !== undefined && { is_active: filters.is_active }) },
      orderBy: { created_at: 'desc' },
    })
    return destinations.map((d) => formatDestination(d as unknown as Record<string, unknown>))
  }

  static async get(id: string) {
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
    const tripIncludeConfig = {
      booking_groups: {
        include: {
          participants: true,
          vehicle: true,
          driver: {
            include: {
              user: true,
              vehicle: true,
            },
          },
        },
      },
      guide: {
        include: {
          driver: {
            include: {
              vehicle: true,
            },
          },
        },
      },
    }

    // Try finding by slug first, then fallback to id
    let dest = await prisma.destination.findUnique({
      where: { slug },
      include: {
        trips: {
          where: { status: { in: ['active', 'scheduled', 'planning'] } },
          include: tripIncludeConfig,
        },
      },
    })

    if (!dest) {
      try {
        dest = await prisma.destination.findUnique({
          where: { id: slug },
          include: {
            trips: {
              where: { status: { in: ['active', 'scheduled', 'planning'] } },
              include: tripIncludeConfig,
            },
          },
        })
      } catch {
        dest = null
      }
    }

    if (!dest) throw new ApiError('Destination not found', 404)

    const formatted = formatDestination(dest as unknown as Record<string, unknown>)
    const activeTrips = (dest.trips || []).map((t) => ({
      id: t.id,
      departureDate: t.departure_date,
      returnDate: t.return_date,
      pricePerPax: Number(dest!.price_per_person),
      status: t.status,
      groups: (t.booking_groups || []).map((g) => {
        const resolvedVehicle = g.vehicle || g.driver?.vehicle || t.guide?.driver?.vehicle || null
        const driverObj =
          g.driver ||
          (t.guide?.driver ? { id: t.guide.driver.id, user: { name: t.guide.name } } : null)

        return {
          id: g.id,
          groupNumber: g.group_number,
          capacity: g.max_participants,
          currentParticipants: g.current_participants,
          status: g.status,
          vehicleId: g.vehicle_id || null,
          driver: driverObj
            ? {
                id: driverObj.id,
                fullName: g.driver?.user?.name || t.guide?.name || 'Driver',
                vehicleModel:
                  resolvedVehicle?.name || resolvedVehicle?.vehicle_type || 'Toyota HiAce Premio',
                plateNumber: resolvedVehicle?.plate_number || 'N 1234 XY',
                vehicle: resolvedVehicle
                  ? {
                      id: resolvedVehicle.id,
                      name: resolvedVehicle.name,
                      plateNumber: resolvedVehicle.plate_number,
                      vehicleType: resolvedVehicle.vehicle_type,
                    }
                  : null,
              }
            : {
                id: 'drv-01',
                fullName: 'Budi Santoso',
                vehicleModel: 'Toyota HiAce Commuter',
                plateNumber: 'N 1234 XY',
                vehicle: null,
              },
          vehicle: resolvedVehicle
            ? {
                id: resolvedVehicle.id,
                name: resolvedVehicle.name,
                plateNumber: resolvedVehicle.plate_number,
                vehicleType: resolvedVehicle.vehicle_type,
                capacity: resolvedVehicle.capacity,
                status: resolvedVehicle.status,
                isAvailable: resolvedVehicle.is_available,
              }
            : null,
        }
      }),
    }))

    return {
      ...formatted,
      activeTrips,
    }
  }

  static async update(id: string, data: Record<string, unknown>) {
    const existing = await prisma.destination.findUnique({ where: { id } })
    if (!existing) throw new ApiError('Destination not found', 404)

    const updateData: Prisma.DestinationUpdateInput = {}

    if (data.name !== undefined || data.title !== undefined) {
      const name = (data.name || data.title) as string
      updateData.name = name
      if (!existing.slug || data.slug) {
        const candidate = (data.slug as string) || name
        updateData.slug = await this.generateUniqueSlug(candidate, id)
      }
    }
    if (data.slug !== undefined && !updateData.slug) {
      updateData.slug = await this.generateUniqueSlug(data.slug as string, id)
    }
    if (data.tagline !== undefined) updateData.tagline = data.tagline as string
    if (data.description !== undefined) updateData.description = data.description as string
    if (data.location !== undefined) updateData.location = data.location as string
    if (
      data.coverImage !== undefined ||
      data.cover_image !== undefined ||
      data.image_url !== undefined
    ) {
      const img = (data.coverImage || data.cover_image || data.image_url) as string
      updateData.cover_image = img
      updateData.image_url = img
    }
    if (data.pricePerPax !== undefined || data.price_per_person !== undefined) {
      const price = Number(data.pricePerPax ?? data.price_per_person)
      updateData.price_per_person = new Prisma.Decimal(price.toString())
    }
    if (data.durationDays !== undefined || data.duration_days !== undefined) {
      updateData.duration_days = Number(data.durationDays ?? data.duration_days)
    }
    if (data.durationNights !== undefined || data.duration_nights !== undefined) {
      updateData.duration_nights = Number(data.durationNights ?? data.duration_nights)
    }
    if (data.galleryImages !== undefined || data.gallery_images !== undefined) {
      updateData.gallery_images = (data.galleryImages ??
        data.gallery_images) as Prisma.InputJsonValue
    }
    if (data.inclusions !== undefined)
      updateData.inclusions = data.inclusions as Prisma.InputJsonValue
    if (data.exclusions !== undefined)
      updateData.exclusions = data.exclusions as Prisma.InputJsonValue
    if (data.highlights !== undefined)
      updateData.highlights = data.highlights as Prisma.InputJsonValue
    if (data.rating !== undefined && data.rating !== null) {
      updateData.rating = new Prisma.Decimal(data.rating.toString())
    }
    if (data.totalReviews !== undefined || data.total_reviews !== undefined) {
      updateData.total_reviews = Number(data.totalReviews ?? data.total_reviews)
    }
    if (data.isPopular !== undefined || data.is_popular !== undefined) {
      updateData.is_popular = Boolean(data.isPopular ?? data.is_popular)
    }
    if (data.meetingPoint !== undefined || data.meeting_point !== undefined) {
      updateData.meeting_point = (data.meetingPoint ?? data.meeting_point) as string
    }
    if (data.maxGroupCapacity !== undefined || data.max_group_capacity !== undefined) {
      updateData.max_group_capacity = Number(data.maxGroupCapacity ?? data.max_group_capacity)
    }
    if (data.itinerary !== undefined) updateData.itinerary = data.itinerary as Prisma.InputJsonValue
    if (data.seoTitle !== undefined || data.seo_title !== undefined) {
      updateData.seo_title = (data.seoTitle ?? data.seo_title) as string
    }
    if (data.seoDescription !== undefined || data.seo_description !== undefined) {
      updateData.seo_description = (data.seoDescription ?? data.seo_description) as string
    }
    if (data.seoKeywords !== undefined || data.seo_keywords !== undefined) {
      const kws = data.seoKeywords ?? data.seo_keywords
      if (Array.isArray(kws)) {
        updateData.seo_keywords = kws as Prisma.InputJsonValue
      } else if (typeof kws === 'string') {
        try {
          const parsed = JSON.parse(kws)
          updateData.seo_keywords = (
            Array.isArray(parsed) ? parsed : [kws]
          ) as Prisma.InputJsonValue
        } catch {
          updateData.seo_keywords = [kws] as Prisma.InputJsonValue
        }
      }
    }
    if (data.seoOgImage !== undefined || data.seo_og_image !== undefined) {
      updateData.seo_og_image = (data.seoOgImage ?? data.seo_og_image) as string
    }
    if (data.customSchemaJson !== undefined || data.custom_schema_json !== undefined) {
      updateData.custom_schema_json = (data.customSchemaJson ?? data.custom_schema_json) as string
    }
    if (data.noIndex !== undefined || data.no_index !== undefined) {
      updateData.no_index = Boolean(data.noIndex ?? data.no_index)
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      updateData.is_active = Boolean(data.isActive ?? data.is_active)
    }

    const updated = await prisma.destination.update({
      where: { id },
      data: updateData,
    })

    return formatDestination(updated as unknown as Record<string, unknown>)
  }

  static async delete(id: string) {
    const destination = await prisma.destination.findUnique({
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
    if (!destination) throw new ApiError('Destination not found', 404)

    const hasParticipants = destination.trips.some((trip) =>
      trip.booking_groups.some((group) => group.participants.length > 0)
    )

    if (hasParticipants) {
      throw new ApiError(
        'Destinasi tidak dapat dihapus karena sudah memiliki peserta booking yang terdaftar.',
        400
      )
    }

    // Cascade delete empty booking groups and trips before deleting destination
    await prisma.$transaction(
      async (tx) => {
        for (const trip of destination.trips) {
          await tx.payment.deleteMany({
            where: { booking_group: { trip_id: trip.id } },
          })
          await tx.bookingGroup.deleteMany({
            where: { trip_id: trip.id },
          })
        }
        await tx.trip.deleteMany({
          where: { destination_id: id },
        })
        await tx.destination.delete({
          where: { id },
        })
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    )
  }
}
