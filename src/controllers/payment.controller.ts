import { Request, Response } from 'express'
import { PaymentService } from '../services/payment.service'
import { sendResponse } from '../utils/response'

export class PaymentController {
  static async createTransaction(req: Request, res: Response) {
    const result = await PaymentService.createTransaction(Number(req.params.participantId))
    sendResponse(res, 201, 'Payment transaction created', result)
  }

  static async handleWebhook(req: Request, res: Response) {
    const result = await PaymentService.handleWebhook(req.body)
    sendResponse(res, 200, 'Webhook processed', result)
  }
}
