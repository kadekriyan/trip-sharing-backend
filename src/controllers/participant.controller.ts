import { Request, Response } from 'express'
import { ParticipantService } from '../services/participant.service'
import { sendResponse } from '../utils/response'

export class ParticipantController {
  static async getMyParticipants(req: Request, res: Response) {
    const participants = await ParticipantService.getParticipants({})
    sendResponse(
      res,
      200,
      'Participants retrieved',
      participants.filter((participant) => participant.user_id === req.user?.id)
    )
  }
}
