import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import {
  AssignDriverInput,
  AssignVehicleInput,
  CreateGroupInput,
  GroupFilterInput,
  UpdateGroupInput,
} from '../types/group'
import { ApiError } from '../utils/errors'

function cleanId(val: unknown): string {
  if (typeof val === 'string') {
    return val.replace(/^(part-|grp-|trip-|dest-|usr-|pay-|drv-|veh-)/, '')
  }
  return String(val || '')
}

export class GroupService {
  static async list(filters: GroupFilterInput = {}) {
    const rawTripId = filters.trip_id || filters.tripId
    const tripId = rawTripId ? cleanId(rawTripId) : undefined
    const rawDriverId = filters.driver_id || filters.driverId
    const driverId = rawDriverId ? cleanId(rawDriverId) : undefined
    const rawVehicleId = filters.vehicle_id || filters.vehicleId
    const vehicleId = rawVehicleId ? cleanId(rawVehicleId) : undefined
    const status = filters.status
    const search = filters.search

    const groups = await prisma.bookingGroup.findMany({
      where: {
        ...(tripId && { trip_id: tripId }),
        ...(status && { status }),
        ...(driverId && { driver_id: driverId }),
        ...(vehicleId && { vehicle_id: vehicleId }),
        ...(search && {
          OR: [
            { trip: { destination: { name: { contains: search, mode: 'insensitive' } } } },
            { driver: { user: { name: { contains: search, mode: 'insensitive' } } } },
            { driver: { license_number: { contains: search, mode: 'insensitive' } } },
            { vehicle: { name: { contains: search, mode: 'insensitive' } } },
            { vehicle: { plate_number: { contains: search, mode: 'insensitive' } } },
            { vehicle: { vehicle_type: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        trip: {
          include: {
            destination: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profile_image_url: true,
              },
            },
            vehicle: true,
          },
        },
        vehicle: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            payment: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: [{ trip: { departure_date: 'asc' } }, { group_number: 'asc' }],
    })

    return groups.map((g) => this.formatGroup(g))
  }

  static async get(id: string) {
    const cleanGroupId = cleanId(id)
    const group = await prisma.bookingGroup.findUnique({
      where: { id: cleanGroupId },
      include: {
        trip: {
          include: {
            destination: true,
            guide: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profile_image_url: true,
              },
            },
            vehicle: true,
          },
        },
        vehicle: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            payment: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    })

    if (!group) throw new ApiError('Booking group not found', 404)
    return this.formatGroup(group)
  }

  static async create(data: CreateGroupInput, adminId?: string) {
    const rawTripId = data.trip_id || data.tripId
    if (!rawTripId) throw new ApiError('Trip ID is required', 400)

    const tripId = cleanId(rawTripId)
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { destination: true },
    })
    if (!trip) throw new ApiError('Trip not found', 404)

    let driverId: string | null = null
    const rawDriverId = data.driver_id || data.driverId
    if (rawDriverId) {
      const cleanDriverId = cleanId(rawDriverId)
      const driver = await prisma.driver.findUnique({ where: { id: cleanDriverId } })
      if (!driver) throw new ApiError('Driver not found', 404)
      driverId = cleanDriverId
    }

    let vehicleId: string | null = null
    const rawVehicleId = data.vehicle_id || data.vehicleId
    if (rawVehicleId) {
      const cleanVehId = cleanId(rawVehicleId)
      const vehicle = await prisma.vehicle.findUnique({ where: { id: cleanVehId } })
      if (!vehicle) throw new ApiError('Armada tidak ditemukan', 404)
      vehicleId = cleanVehId
    }

    let groupNumber = data.group_number || data.groupNumber
    if (!groupNumber) {
      const lastGroup = await prisma.bookingGroup.findFirst({
        where: { trip_id: tripId },
        orderBy: { group_number: 'desc' },
        select: { group_number: true },
      })
      groupNumber = (lastGroup?.group_number || 0) + 1
    } else {
      const existing = await prisma.bookingGroup.findUnique({
        where: {
          trip_id_group_number: {
            trip_id: tripId,
            group_number: groupNumber,
          },
        },
      })
      if (existing) {
        throw new ApiError(`Group #${groupNumber} already exists for this trip`, 409)
      }
    }

    const maxParticipants = data.max_participants || data.maxParticipants || 6
    const rawPrice =
      data.price_per_person ?? data.pricePerPerson ?? trip.destination.price_per_person
    const pricePerPerson = new Prisma.Decimal(rawPrice.toString())
    const totalPrice = pricePerPerson.mul(maxParticipants)
    const status = data.status || 'open'

    const group = await prisma.bookingGroup.create({
      data: {
        trip_id: tripId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        group_number: groupNumber,
        status,
        current_participants: 0,
        max_participants: maxParticipants,
        price_per_person: pricePerPerson,
        total_price: totalPrice,
      },
      include: {
        trip: { include: { destination: true } },
        driver: { include: { user: true, vehicle: true } },
        vehicle: true,
        participants: true,
      },
    })

    if (adminId) {
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'CREATE_BOOKING_GROUP',
          entity_type: 'BookingGroup',
          entity_id: group.id,
          new_values: JSON.parse(JSON.stringify(group)),
        },
      })
    }

    return this.formatGroup(group)
  }

  static async update(id: string, data: UpdateGroupInput, adminId?: string) {
    const cleanGroupId = cleanId(id)
    const existing = await prisma.bookingGroup.findUnique({
      where: { id: cleanGroupId },
      include: { trip: { include: { destination: true } } },
    })
    if (!existing) throw new ApiError('Booking group not found', 404)

    const updateData: Prisma.BookingGroupUpdateInput = {}

    if (data.driver_id !== undefined || data.driverId !== undefined) {
      const rawDriverId = data.driver_id ?? data.driverId
      if (rawDriverId) {
        const cleanDriverId = cleanId(rawDriverId)
        const driver = await prisma.driver.findUnique({ where: { id: cleanDriverId } })
        if (!driver) throw new ApiError('Driver not found', 404)
        updateData.driver = { connect: { id: cleanDriverId } }
      } else {
        updateData.driver = { disconnect: true }
      }
    }

    if (data.vehicle_id !== undefined || data.vehicleId !== undefined) {
      const rawVehId = data.vehicle_id ?? data.vehicleId
      if (rawVehId) {
        const cleanVehId = cleanId(rawVehId)
        const vehicle = await prisma.vehicle.findUnique({ where: { id: cleanVehId } })
        if (!vehicle) throw new ApiError('Armada tidak ditemukan', 404)
        updateData.vehicle = { connect: { id: cleanVehId } }
      } else {
        updateData.vehicle = { disconnect: true }
      }
    }

    if (data.group_number !== undefined || data.groupNumber !== undefined) {
      const num = Number(data.group_number ?? data.groupNumber)
      if (num !== existing.group_number) {
        const dup = await prisma.bookingGroup.findUnique({
          where: {
            trip_id_group_number: {
              trip_id: existing.trip_id,
              group_number: num,
            },
          },
        })
        if (dup) throw new ApiError(`Group #${num} already exists for this trip`, 409)
        updateData.group_number = num
      }
    }

    if (data.max_participants !== undefined || data.maxParticipants !== undefined) {
      const maxP = Number(data.max_participants ?? data.maxParticipants)
      if (maxP < existing.current_participants) {
        throw new ApiError(
          `Max participants (${maxP}) cannot be less than current participants (${existing.current_participants})`,
          400
        )
      }
      updateData.max_participants = maxP
      const currentPrice = existing.price_per_person
      updateData.total_price = currentPrice.mul(maxP)
    }

    if (data.price_per_person !== undefined || data.pricePerPerson !== undefined) {
      const price = new Prisma.Decimal(
        (data.price_per_person ?? data.pricePerPerson)!.toString()
      )
      updateData.price_per_person = price
      const maxP = updateData.max_participants ? Number(updateData.max_participants) : existing.max_participants
      updateData.total_price = price.mul(maxP)
    }

    if (data.status !== undefined) {
      updateData.status = data.status
    }

    const updated = await prisma.bookingGroup.update({
      where: { id: cleanGroupId },
      data: updateData,
      include: {
        trip: { include: { destination: true } },
        driver: { include: { user: true, vehicle: true } },
        vehicle: true,
        participants: { include: { user: true } },
      },
    })

    if (adminId) {
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'UPDATE_BOOKING_GROUP',
          entity_type: 'BookingGroup',
          entity_id: cleanGroupId,
          old_values: JSON.parse(JSON.stringify(existing)),
          new_values: JSON.parse(JSON.stringify(updated)),
        },
      })
    }

    return this.formatGroup(updated)
  }

  static async assignDriver(id: string, data: AssignDriverInput, adminId?: string) {
    const cleanGroupId = cleanId(id)
    const existing = await prisma.bookingGroup.findUnique({
      where: { id: cleanGroupId },
      include: { driver: { include: { user: true } } },
    })
    if (!existing) throw new ApiError('Booking group not found', 404)

    const rawDriverId = data.driver_id ?? data.driverId
    let updatedDriverId: string | null = null
    let driverInfo = null

    if (rawDriverId) {
      const cleanDriverId = cleanId(rawDriverId)
      const driver = await prisma.driver.findUnique({
        where: { id: cleanDriverId },
        include: { user: true },
      })
      if (!driver) throw new ApiError('Driver not found', 404)
      updatedDriverId = cleanDriverId
      driverInfo = driver
    }

    const updated = await prisma.bookingGroup.update({
      where: { id: cleanGroupId },
      data: {
        driver_id: updatedDriverId,
      },
      include: {
        trip: { include: { destination: true } },
        driver: { include: { user: true, vehicle: true } },
        vehicle: true,
        participants: true,
      },
    })

    if (adminId) {
      const action = updatedDriverId ? 'ASSIGN_DRIVER_TO_GROUP' : 'UNASSIGN_DRIVER_FROM_GROUP'
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action,
          entity_type: 'BookingGroup',
          entity_id: cleanGroupId,
          new_values: {
            groupId: cleanGroupId,
            driverId: updatedDriverId,
            driverName: driverInfo?.user?.name || null,
            previousDriverId: existing.driver_id,
          },
        },
      })
    }

    return this.formatGroup(updated)
  }

  static async assignVehicle(id: string, data: AssignVehicleInput, adminId?: string) {
    const cleanGroupId = cleanId(id)
    const existing = await prisma.bookingGroup.findUnique({
      where: { id: cleanGroupId },
      include: { vehicle: true },
    })
    if (!existing) throw new ApiError('Booking group not found', 404)

    const rawVehicleId = data.vehicle_id ?? data.vehicleId
    let updatedVehicleId: string | null = null
    let vehicleInfo = null

    if (rawVehicleId) {
      const cleanVehicleId = cleanId(rawVehicleId)
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: cleanVehicleId },
      })
      if (!vehicle) throw new ApiError('Armada tidak ditemukan', 404)
      updatedVehicleId = cleanVehicleId
      vehicleInfo = vehicle
    }

    const updated = await prisma.bookingGroup.update({
      where: { id: cleanGroupId },
      data: {
        vehicle_id: updatedVehicleId,
      },
      include: {
        trip: { include: { destination: true } },
        driver: { include: { user: true, vehicle: true } },
        vehicle: true,
        participants: true,
      },
    })

    if (adminId) {
      const action = updatedVehicleId ? 'ASSIGN_VEHICLE_TO_GROUP' : 'UNASSIGN_VEHICLE_FROM_GROUP'
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action,
          entity_type: 'BookingGroup',
          entity_id: cleanGroupId,
          new_values: {
            groupId: cleanGroupId,
            vehicleId: updatedVehicleId,
            vehicleName: vehicleInfo?.name || null,
            vehiclePlate: vehicleInfo?.plate_number || null,
            previousVehicleId: existing.vehicle_id,
          },
        },
      })
    }

    return this.formatGroup(updated)
  }

  static async delete(id: string, adminId?: string) {
    const cleanGroupId = cleanId(id)
    const group = await prisma.bookingGroup.findUnique({
      where: { id: cleanGroupId },
      include: { participants: true },
    })
    if (!group) throw new ApiError('Booking group not found', 404)

    if (group.participants.length > 0 || group.current_participants > 0) {
      throw new ApiError(
        'Cannot delete booking group with existing participants. Please move or cancel participants first.',
        400
      )
    }

    await prisma.bookingGroup.delete({ where: { id: cleanGroupId } })

    if (adminId) {
      await prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'DELETE_BOOKING_GROUP',
          entity_type: 'BookingGroup',
          entity_id: cleanGroupId,
          old_values: JSON.parse(JSON.stringify(group)),
        },
      })
    }

    return { id: cleanGroupId, deleted: true }
  }

  private static formatGroup(g: Record<string, unknown>) {
    const driver = g.driver as (Record<string, unknown> & { vehicle?: Record<string, unknown> | null }) | null | undefined
    const driverUser = driver?.user as Record<string, unknown> | null | undefined
    const driverVehicle = driver?.vehicle as Record<string, unknown> | null | undefined
    const groupVehicle = g.vehicle as Record<string, unknown> | null | undefined
    const trip = g.trip as Record<string, unknown> | null | undefined
    const destination = trip?.destination as Record<string, unknown> | null | undefined
    const participants = (g.participants as Array<Record<string, unknown>>) || []

    // Effective vehicle is group's direct vehicle, or driver's assigned vehicle fallback
    const effectiveVehicle = groupVehicle || driverVehicle || null

    return {
      id: g.id,
      tripId: g.trip_id,
      driverId: g.driver_id || null,
      vehicleId: g.vehicle_id || null,
      groupNumber: g.group_number,
      status: g.status,
      currentParticipants: g.current_participants,
      maxParticipants: g.max_participants,
      pricePerPerson: Number(g.price_per_person),
      totalPrice: g.total_price ? Number(g.total_price) : null,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      trip: trip
        ? {
            id: trip.id,
            destinationId: trip.destination_id,
            departureDate: trip.departure_date,
            returnDate: trip.return_date,
            status: trip.status,
            destination: destination
              ? {
                  id: destination.id,
                  name: destination.name,
                  slug: destination.slug,
                  location: destination.location,
                  coverImage: destination.cover_image,
                }
              : null,
          }
        : null,
      driver: driver
        ? {
            id: driver.id,
            userId: driver.user_id,
            licenseNumber: driver.license_number,
            vehicleType: (driverVehicle?.vehicle_type as string) || (driver.vehicle_type as string) || null,
            plateNumber: (driverVehicle?.plate_number as string) || (driver.vehicle_plat as string) || null,
            rating: Number(driver.rating || 0),
            isAvailable: driver.is_available,
            fullName: driverUser?.name || null,
            phoneNumber: driverUser?.phone || null,
            email: driverUser?.email || null,
            photoUrl: driverUser?.profile_image_url || null,
            vehicle: driverVehicle
              ? {
                  id: driverVehicle.id,
                  name: driverVehicle.name,
                  plateNumber: driverVehicle.plate_number,
                  vehicleType: driverVehicle.vehicle_type,
                }
              : null,
          }
        : null,
      vehicle: effectiveVehicle
        ? {
            id: effectiveVehicle.id,
            name: effectiveVehicle.name,
            plateNumber: effectiveVehicle.plate_number,
            plate_number: effectiveVehicle.plate_number,
            vehicleType: effectiveVehicle.vehicle_type,
            vehicle_type: effectiveVehicle.vehicle_type,
            capacity: effectiveVehicle.capacity,
            transmission: effectiveVehicle.transmission || null,
            fuelType: effectiveVehicle.fuel_type || null,
            fuel_type: effectiveVehicle.fuel_type || null,
            facility: effectiveVehicle.facility || null,
            coverImage: effectiveVehicle.cover_image || null,
            cover_image: effectiveVehicle.cover_image || null,
            status: effectiveVehicle.status || 'active',
            isAvailable: effectiveVehicle.is_available ?? true,
            is_available: effectiveVehicle.is_available ?? true,
          }
        : null,
      participants: participants.map((p) => ({
        id: p.id,
        bookingCode: p.booking_code,
        fullName: p.full_name,
        phoneNumber: p.phone_number,
        paymentStatus: p.payment_status,
        checkInStatus: p.check_in_status || 'pending',
        user: p.user || null,
        payment: p.payment || null,
      })),
    }
  }
}
