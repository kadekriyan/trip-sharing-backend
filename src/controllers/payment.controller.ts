import { Request, Response } from 'express'
import { PaymentService } from '../services/payment.service'
import { sendResponse } from '../utils/response'

function parseNumericId(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const cleaned = val.replace(/^\D+/g, '')
    const num = parseInt(cleaned, 10)
    return isNaN(num) ? 0 : num
  }
  return 0
}

export class PaymentController {
  static async createTransaction(req: Request, res: Response) {
    const rawId = req.params.participantId || req.params.id
    const participantId = parseNumericId(rawId)
    const result = await PaymentService.createTransaction(participantId)
    sendResponse(res, 200, 'Payment transaction created', result)
  }

  static async handleWebhook(req: Request, res: Response) {
    const result = await PaymentService.handleWebhook(req.body)
    sendResponse(res, 200, 'Status pembayaran berhasil diperbarui.', result)
  }
}
