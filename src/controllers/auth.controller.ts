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
}
