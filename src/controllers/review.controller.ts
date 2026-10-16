import { Request, Response } from 'express'
import { ReviewService } from '../services/review.service'
import { TripService } from '../services/trip.service'
import { sendResponse } from '../utils/response'

export class ReviewController {
  /**
   * GET /api/reviews/verify/:token
   */
  static async verifyToken(req: Request, res: Response) {
    const { token } = req.params
    const data = await ReviewService.verifyToken(token)
    sendResponse(res, 200, 'Review token verified successfully', data)
  }

  /**
   * POST /api/reviews/submit/:token
   */
  static async submitReview(req: Request, res: Response) {
    const { token } = req.params
    const review = await ReviewService.submitReview(token, req.body)
    sendResponse(res, 201, 'Ulasan berhasil dikirim dan menunggu moderasi admin', review)
  }

  /**
   * GET /api/reviews/destination/:idOrSlug
   */
  static async listApprovedByDestination(req: Request, res: Response) {
    const { idOrSlug } = req.params
    const data = await ReviewService.listApprovedByDestination(idOrSlug)
    sendResponse(res, 200, 'Approved reviews retrieved successfully', data)
  }

  /**
   * GET /api/admin/reviews
   */
  static async listAdminReviews(req: Request, res: Response) {
    const destinationId = (req.query.destination_id || req.query.destinationId) as string | undefined
    const tripId = (req.query.trip_id || req.query.tripId) as string | undefined
    const status = req.query.status as string | undefined
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined

    const result = await ReviewService.listReviews({
      destination_id: destinationId,
      trip_id: tripId,
      status,
      page,
      limit,
    })

    sendResponse(res, 200, 'Reviews retrieved successfully', result.reviews, result.pagination)
  }

  /**
   * PATCH /api/admin/reviews/:id/moderate
   */
  static async moderateReview(req: Request, res: Response) {
    const { id } = req.params
    const { status, rejection_reason, rejectionReason } = req.body
    const updated = await ReviewService.moderateReview(id, {
      status,
      rejection_reason,
      rejectionReason,
    })
    sendResponse(res, 200, `Review status updated to ${status}`, updated)
  }

  /**
   * POST /api/admin/reviews/:id/reply
   */
  static async replyReview(req: Request, res: Response) {
    const { id } = req.params
    const replyText = req.body.admin_reply || req.body.adminReply
    const user = (req as unknown as { user?: { id?: string } }).user
    const adminUserId = user?.id

    const updated = await ReviewService.replyReview(id, replyText, adminUserId)
    sendResponse(res, 200, 'Admin reply saved successfully', updated)
  }

  /**
   * POST /api/admin/trips/:id/send-review-invites
   */
  static async sendTripInvites(req: Request, res: Response) {
    const { id } = req.params
    const customBaseUrl =
      req.body?.baseUrl || (typeof req.headers.origin === 'string' ? req.headers.origin : undefined)

    const result = await ReviewService.sendTripReviewInvites(id, customBaseUrl)
    sendResponse(res, 200, 'Review invites dispatched', result)
  }

  /**
   * PATCH /api/trips/:id/complete
   */
  static async completeTrip(req: Request, res: Response) {
    const { id } = req.params
    const trip = await TripService.completeTrip(id)
    sendResponse(res, 200, 'Trip marked as completed', trip)
  }
}
