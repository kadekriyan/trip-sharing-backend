import { Request, Response } from 'express'
import { PaymentService } from '../services/payment.service'
import { sendResponse } from '../utils/response'

export class PaymentController {
  static async createTransaction(req: Request, res: Response) {
    const rawId = req.params.participantId || req.params.id
    const result = await PaymentService.createTransaction(rawId)
    sendResponse(res, 200, 'Payment transaction created', result)
  }

  static async handleWebhook(req: Request, res: Response) {
    const result = await PaymentService.handleWebhook(req.body)
    sendResponse(res, 200, 'Status pembayaran berhasil diperbarui.', result)
  }
}
