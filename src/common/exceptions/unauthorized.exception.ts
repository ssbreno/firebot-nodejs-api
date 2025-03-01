import { BaseException } from './base.exception'

export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized access', metadata?: Record<string, any>) {
    super(message, 401, 'UNAUTHORIZED', metadata)
    this.name = 'UnauthorizedException'
  }
}
