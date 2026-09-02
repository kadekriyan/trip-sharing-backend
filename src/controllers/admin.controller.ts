import { Request, Response } from 'express'
import { AdminService } from '../services/admin.service'
import { ArticleService } from '../services/article.service'
import { DestinationService } from '../services/destination.service'
import { DriverService } from '../services/driver.service'
import { ParticipantService } from '../services/participant.service'
import { TripService } from '../services/trip.service'
import { sendResponse } from '../utils/response'

export class AdminController {
  static async getMetrics(_req: Request, res: Response) {
    const metrics = await AdminService.getMetrics()
    sendResponse(res, 200, 'Metrics retrieved successfully', metrics)
  }

  static async getAuditLogs(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const result = await AdminService.getAuditLogs(page, limit)
    sendResponse(res, 200, 'Audit logs retrieved', result.data, result.meta)
  }

  static async createParticipant(req: Request, res: Response) {
    const result = await ParticipantService.createParticipantAsAdmin({
      ...req.body,
      admin_id: req.user?.id,
    })
    sendResponse(res, 201, 'Peserta manual berhasil ditambahkan ke armada.', result)
  }

  static async getParticipants(req: Request, res: Response) {
    const participants = await ParticipantService.getParticipants({
      trip_id: req.query.trip_id
        ? Number(req.query.trip_id)
        : req.query.tripId
          ? Number(req.query.tripId)
          : undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    })
    sendResponse(res, 200, 'Participants retrieved', participants)
  }

  static async updateParticipant(req: Request, res: Response) {
    const updated = await ParticipantService.updateParticipant(Number(req.params.id), req.body)
    sendResponse(res, 200, 'Participant updated', updated)
  }

  static async deleteParticipant(req: Request, res: Response) {
    await ParticipantService.deleteParticipant(Number(req.params.id))
    sendResponse(res, 200, 'Participant deleted')
  }

  static async moveParticipant(req: Request, res: Response) {
    const parseId = (val: unknown) => {
      if (typeof val === 'number') return val
      if (typeof val === 'string') {
        const num = parseInt(val.replace(/^\D+/g, ''), 10)
        return isNaN(num) ? 0 : num
      }
      return 0
    }

    const participantId = req.params.id ? Number(req.params.id) : parseId(req.body.participantId)
    const targetGroupId = req.body.new_group_id
      ? Number(req.body.new_group_id)
      : parseId(req.body.targetGroupId)

    const result = await ParticipantService.moveParticipant(
      participantId,
      targetGroupId,
      req.body.reason,
      req.user?.id
    )
    sendResponse(
      res,
      200,
      `Peserta berhasil dipindahkan ke Grup ${result.newGroup.group_number}.`,
      result
    )
  }

  static async createDestination(req: Request, res: Response) {
    const destination = await DestinationService.create(req.body)
    sendResponse(res, 201, 'Destination created successfully', destination)
  }

  static async getDestinations(req: Request, res: Response) {
    const destinations = await DestinationService.adminList({
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    })
    sendResponse(res, 200, 'Destinations retrieved', destinations)
  }

  static async getDestination(req: Request, res: Response) {
    const destination = await DestinationService.get(Number(req.params.id))
    sendResponse(res, 200, 'Destination retrieved', destination)
  }

  static async updateDestination(req: Request, res: Response) {
    const destination = await DestinationService.update(Number(req.params.id), req.body)
    sendResponse(res, 200, 'Destination updated', destination)
  }

  static async deleteDestination(req: Request, res: Response) {
    await DestinationService.delete(Number(req.params.id))
    sendResponse(res, 200, 'Destination deleted')
  }

  static async createTrip(req: Request, res: Response) {
    const trip = await TripService.create({
      ...req.body,
      departure_date: new Date(req.body.departure_date),
      return_date: req.body.return_date ? new Date(req.body.return_date) : undefined,
    })
    sendResponse(res, 201, 'Trip created successfully', trip)
  }

  static async getTrips(req: Request, res: Response) {
    const trips = await TripService.list({
      destination_id: req.query.destination_id ? Number(req.query.destination_id) : undefined,
      status: req.query.status as string | undefined,
    })
    sendResponse(res, 200, 'Trips retrieved', trips)
  }

  static async getTrip(req: Request, res: Response) {
    const trip = await TripService.get(Number(req.params.id))
    sendResponse(res, 200, 'Trip retrieved', trip)
  }

  static async updateTrip(req: Request, res: Response) {
    const data = {
      ...req.body,
      ...(req.body.departure_date ? { departure_date: new Date(req.body.departure_date) } : {}),
      ...(req.body.return_date !== undefined
        ? { return_date: req.body.return_date === null ? null : new Date(req.body.return_date) }
        : {}),
    }
    const trip = await TripService.update(Number(req.params.id), data)
    sendResponse(res, 200, 'Trip updated', trip)
  }

  static async deleteTrip(req: Request, res: Response) {
    await TripService.delete(Number(req.params.id))
    sendResponse(res, 200, 'Trip deleted')
  }

  static async createArticle(req: Request, res: Response) {
    const article = await ArticleService.create({
      ...req.body,
      author_id: req.body.author_id || req.user?.id,
    })
    sendResponse(res, 201, 'Article created successfully', article)
  }

  static async getArticles(req: Request, res: Response) {
    const articles = await ArticleService.adminList({
      is_published:
        req.query.is_published !== undefined ? req.query.is_published === 'true' : undefined,
      category: req.query.category as string | undefined,
    })
    sendResponse(res, 200, 'Articles retrieved', articles)
  }

  static async getArticle(req: Request, res: Response) {
    const article = await ArticleService.get(Number(req.params.id))
    sendResponse(res, 200, 'Article retrieved', article)
  }

  static async updateArticle(req: Request, res: Response) {
    const article = await ArticleService.update(Number(req.params.id), req.body)
    sendResponse(res, 200, 'Article updated', article)
  }

  static async deleteArticle(req: Request, res: Response) {
    await ArticleService.delete(Number(req.params.id))
    sendResponse(res, 200, 'Article deleted')
  }

  static async createDriver(req: Request, res: Response) {
    const driver = await DriverService.create(req.body)
    sendResponse(res, 201, 'Driver created successfully', driver)
  }

  static async getDrivers(req: Request, res: Response) {
    const drivers = await DriverService.list({
      is_available:
        req.query.is_available !== undefined ? req.query.is_available === 'true' : undefined,
    })
    sendResponse(res, 200, 'Drivers retrieved', drivers)
  }

  static async getDriver(req: Request, res: Response) {
    const driver = await DriverService.get(Number(req.params.id))
    sendResponse(res, 200, 'Driver retrieved', driver)
  }

  static async updateDriver(req: Request, res: Response) {
    const driver = await DriverService.update(Number(req.params.id), req.body)
    sendResponse(res, 200, 'Driver updated', driver)
  }

  static async deleteDriver(req: Request, res: Response) {
    await DriverService.delete(Number(req.params.id))
    sendResponse(res, 200, 'Driver deleted')
  }
}
