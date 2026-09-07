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

  static async simulatePayment(req: Request, res: Response) {
    const rawId = req.params.id || req.params.participantId
    const action = req.body.action || 'settle'
    const result = await PaymentService.simulatePayment(rawId, action)
    sendResponse(res, 200, result.message, result.payment)
  }
}
