import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { sendResponse } from '../utils/response'

export class AuthController {
  static async register(req: Request, res: Response) {
    const result = await AuthService.register(req.body)
    sendResponse(res, 201, 'Registrasi berhasil.', result)
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body
    const result = await AuthService.login(email, password)
    sendResponse(res, 200, 'Login berhasil.', result)
  }

  static async me(req: Request, res: Response) {
    if (!req.user?.id) {
      return sendResponse(res, 200, 'Authenticated user', req.user)
    }
    const profile = await AuthService.getMe(req.user.id)
    sendResponse(res, 200, 'Authenticated user', profile)
  }

  static async forgotPassword(req: Request, res: Response) {
    const { email, clientBaseUrl } = req.body
    const result = await AuthService.forgotPassword(email, clientBaseUrl)
    sendResponse(res, 200, result.message, result)
  }

  static async verifyResetToken(req: Request, res: Response) {
    const token = String(req.query.token || req.body?.token || '')
    const result = await AuthService.verifyResetToken(token)
    sendResponse(res, 200, 'Token valid', result)
  }

  static async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body
    const result = await AuthService.resetPassword(token, password)
    sendResponse(res, 200, result.message, result)
  }

  static async changePassword(req: Request, res: Response) {
    const userId = req.user?.id
    if (!userId) {
      return sendResponse(res, 401, 'Unauthorized')
    }
    const { currentPassword, newPassword } = req.body
    const result = await AuthService.changePassword(userId, currentPassword, newPassword)
    sendResponse(res, 200, result.message, result)
  }
}


