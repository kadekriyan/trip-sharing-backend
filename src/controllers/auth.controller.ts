import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { sendResponse } from '../utils/response'

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password, name } = req.body
    const result = await AuthService.register(email, password, name)
    sendResponse(res, 201, 'Registration successful', result)
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body
    const result = await AuthService.login(email, password)
    sendResponse(res, 200, 'Login successful', result)
  }

  static async me(req: Request, res: Response) {
    sendResponse(res, 200, 'Authenticated user', req.user)
  }
}
