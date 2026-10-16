import crypto from 'crypto'
import { prisma } from '../config/database'
import { ApiError } from '../utils/errors'
import { FonnteService } from './fonnte.service'
import { logger } from '../utils/logger'

export interface ReviewFilters {
  destination_id?: string
  destinationId?: string
  status?: string
  trip_id?: string
  tripId?: string
  page?: number
  limit?: number
}

export class ReviewService {
  /**
   * Verifikasi validitas token review dan mengembalikan ringkasan data trip & peserta
   */
  static async verifyToken(token: string) {
    if (!token) {
      throw new ApiError('Review token is required', 400)
    }

    const review = await prisma.review.findUnique({
      where: { review_token: token },
      include: {
        destination: true,
        trip: true,
        participant: true,
      },
    })

    if (!review) {
      throw new ApiError('Tautan ulasan tidak valid atau sudah kedaluwarsa', 404)
    }

    if (review.is_submitted) {
      return {
        token: review.review_token,
        isValid: true,
        isSubmitted: true,
        tripId: review.trip_id,
        departureDate: review.trip.departure_date,
        destinationId: review.destination_id,
        destinationTitle: review.destination.name,
        destinationSlug: review.destination.slug || undefined,
        destinationImage: review.destination.image_url || review.destination.cover_image || undefined,
        participantId: review.participant_id,
        participantName: review.participant.full_name,
        existingReview: {
          rating: review.rating,
          comment: review.comment,
          submittedAt: review.submitted_at || review.updated_at,
          status: review.status,
          adminReply: review.admin_reply,
        },
      }
    }

    return {
      token: review.review_token,
      isValid: true,
      isSubmitted: false,
      tripId: review.trip_id,
      departureDate: review.trip.departure_date,
      destinationId: review.destination_id,
      destinationTitle: review.destination.name,
      destinationSlug: review.destination.slug || undefined,
      destinationImage: review.destination.image_url || review.destination.cover_image || undefined,
      participantId: review.participant_id,
      participantName: review.participant.full_name,
    }
  }

  /**
   * Pengiriman ulasan oleh customer yang terverifikasi via token
   */
  static async submitReview(token: string, payload: { rating: number; comment: string }) {
    if (!token) {
      throw new ApiError('Review token is required', 400)
    }

    const review = await prisma.review.findUnique({
      where: { review_token: token },
      include: { destination: true, trip: true, participant: true },
    })

    if (!review) {
      throw new ApiError('Tautan ulasan tidak ditemukan atau tidak valid', 404)
    }

    if (review.is_submitted) {
      throw new ApiError('Ulasan untuk perjalanan ini sudah pernah dikirimkan sebelumnya', 400)
    }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
        comment: payload.comment.trim(),
        status: 'PENDING',
        is_submitted: true,
        submitted_at: new Date(),
      },
      include: { destination: true, participant: true },
    })

    logger.info('New verified customer review submitted', {
      reviewId: updated.id,
      destinationId: updated.destination_id,
      participantId: updated.participant_id,
      rating: updated.rating,
    })

    return updated
  }

  /**
   * List review untuk manajemen admin dengan filter & pagination
   */
  static async listReviews(filters: ReviewFilters) {
    const destinationId = filters.destination_id || filters.destinationId
    const tripId = filters.trip_id || filters.tripId
    const status = filters.status
    const page = Math.max(1, Number(filters.page || 1))
    const limit = Math.max(1, Math.min(100, Number(filters.limit || 20)))
    const skip = (page - 1) * limit

    const whereClause: Record<string, unknown> = {}
    if (destinationId) whereClause.destination_id = destinationId
    if (tripId) whereClause.trip_id = tripId
    if (status && status !== 'ALL') whereClause.status = status

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          destination: {
            select: { id: true, name: true, slug: true, cover_image: true, image_url: true },
          },
          trip: {
            select: { id: true, departure_date: true, status: true },
          },
          participant: {
            select: { id: true, full_name: true, phone_number: true, booking_code: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: whereClause }),
    ])

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Mengambil ulasan yang telah di-approve untuk ditampilkan pada halaman publik destinasi
   */
  static async listApprovedByDestination(destinationIdOrSlug: string) {
    let destination = await prisma.destination.findUnique({
      where: { id: destinationIdOrSlug },
    })

    if (!destination) {
      destination = await prisma.destination.findUnique({
        where: { slug: destinationIdOrSlug },
      })
    }

    if (!destination) {
      throw new ApiError('Destination not found', 404)
    }

    const reviews = await prisma.review.findMany({
      where: {
        destination_id: destination.id,
        status: 'APPROVED',
        is_submitted: true,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        admin_reply: true,
        replied_at: true,
        submitted_at: true,
        created_at: true,
        participant: {
          select: {
            full_name: true,
          },
        },
      },
      orderBy: { submitted_at: 'desc' },
    })

    return {
      destination: {
        id: destination.id,
        name: destination.name,
        slug: destination.slug,
        rating: Number(destination.rating || 0),
        totalReviews: destination.total_reviews,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        travelerName: r.participant?.full_name || 'Verified Traveler',
        adminReply: r.admin_reply,
        repliedAt: r.replied_at,
        submittedAt: r.submitted_at || r.created_at,
      })),
    }
  }

  /**
   * Moderasi review oleh admin (Approve / Reject) dan update agregasi rating destinasi
   */
  static async moderateReview(
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string; rejectionReason?: string }
  ) {
    const review = await prisma.review.findUnique({
      where: { id },
      include: { destination: true },
    })

    if (!review) {
      throw new ApiError('Review not found', 404)
    }

    const status = payload.status
    const rejectionReason = payload.rejection_reason ?? payload.rejectionReason ?? null

    const updated = await prisma.review.update({
      where: { id },
      data: {
        status,
        rejection_reason: status === 'REJECTED' ? rejectionReason : null,
      },
      include: { destination: true, participant: true },
    })

    // Hitung ulang rating & total_reviews destinasi secara otomatis
    await this.recalculateDestinationRating(review.destination_id)

    logger.info('Review moderated by admin', {
      reviewId: id,
      newStatus: status,
      destinationId: review.destination_id,
    })

    return updated
  }

  /**
   * Balasan resmi pengelola/admin atas ulasan traveler (1-arah)
   */
  static async replyReview(id: string, replyText: string, adminUserId?: string) {
    const review = await prisma.review.findUnique({ where: { id } })
    if (!review) {
      throw new ApiError('Review not found', 404)
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        admin_reply: replyText.trim(),
        replied_at: new Date(),
        replied_by: adminUserId || null,
      },
      include: { destination: true, participant: true },
    })

    logger.info('Admin replied to review', {
      reviewId: id,
      repliedBy: adminUserId,
    })

    return updated
  }

  /**
   * Broadcast undangan review ke semua peserta manifest yang sah via Fonnte & sediakan link cadangan
   */
  static async sendTripReviewInvites(tripId: string, customBaseUrl?: string) {
    const cleanId = tripId.replace(/^trip-/, '')
    const trip = await prisma.trip.findUnique({
      where: { id: cleanId },
      include: {
        destination: true,
        booking_groups: {
          include: {
            participants: true,
          },
        },
      },
    })

    if (!trip) {
      throw new ApiError('Trip not found', 404)
    }

    // Kumpulkan semua peserta berstatus lunas (paid)
    const allParticipants = trip.booking_groups.flatMap((g) => g.participants)
    const paidParticipants = allParticipants.filter((p) => {
      const payStatus = (p.payment_status || '').toLowerCase()
      return payStatus === 'paid' || payStatus === 'completed'
    })

    const baseUrl = (
      customBaseUrl ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://javasharedtour.co.id'
    ).replace(/\/$/, '')

    let sentCount = 0
    let failedCount = 0

    const results = []

    for (const participant of paidParticipants) {
      // Periksa apakah peserta sudah memiliki review record / token
      let review = await prisma.review.findUnique({
        where: { participant_id: participant.id },
      })

      if (!review) {
        const uniqueToken = crypto.randomBytes(20).toString('hex')
        review = await prisma.review.create({
          data: {
            destination_id: trip.destination_id,
            trip_id: trip.id,
            participant_id: participant.id,
            user_id: participant.user_id || null,
            review_token: uniqueToken,
            status: 'PENDING',
            comment: '',
            rating: 5,
            is_submitted: false,
          },
        })
      }

      const reviewUrl = `${baseUrl}/review/${review.review_token}`

      if (review.is_submitted) {
        results.push({
          participantId: participant.id,
          fullName: participant.full_name,
          phoneNumber: participant.phone_number,
          reviewToken: review.review_token,
          reviewUrl,
          status: 'SKIPPED' as const,
          error: 'Customer already submitted review',
        })
        continue
      }

      // Format dan kirim pesan via Fonnte
      const message = FonnteService.formatReviewInvitation({
        customerName: participant.full_name,
        destinationTitle: trip.destination.name,
        departureDate: trip.departure_date,
        reviewUrl,
      })

      const sendResult = await FonnteService.sendMessage(participant.phone_number, message)

      if (sendResult.success) {
        sentCount++
        results.push({
          participantId: participant.id,
          fullName: participant.full_name,
          phoneNumber: participant.phone_number,
          reviewToken: review.review_token,
          reviewUrl,
          status: 'SENT' as const,
        })
      } else {
        failedCount++
        results.push({
          participantId: participant.id,
          fullName: participant.full_name,
          phoneNumber: participant.phone_number,
          reviewToken: review.review_token,
          reviewUrl,
          status: 'FAILED' as const,
          error: sendResult.error,
        })
      }
    }

    return {
      tripId: trip.id,
      destinationTitle: trip.destination.name,
      departureDate: trip.departure_date,
      totalParticipants: paidParticipants.length,
      sentCount,
      failedCount,
      results,
    }
  }

  /**
   * Helper internal untuk menghitung ulang rata-rata rating destinasi dari ulasan APPROVED
   */
  private static async recalculateDestinationRating(destinationId: string) {
    const approvedReviews = await prisma.review.findMany({
      where: {
        destination_id: destinationId,
        status: 'APPROVED',
        is_submitted: true,
      },
      select: { rating: true },
    })

    const totalReviews = approvedReviews.length
    let avgRating = 0

    if (totalReviews > 0) {
      const sum = approvedReviews.reduce((acc, r) => acc + (r.rating || 0), 0)
      avgRating = Math.round((sum / totalReviews) * 100) / 100
    }

    await prisma.destination.update({
      where: { id: destinationId },
      data: {
        rating: avgRating,
        total_reviews: totalReviews,
      },
    })
  }
}
