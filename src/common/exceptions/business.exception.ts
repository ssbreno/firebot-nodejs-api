import { BaseException } from './base.exception'

export class BusinessException extends BaseException {
  constructor(message: string, errorCode?: string, metadata?: Record<string, any>) {
    super(message, 400, errorCode || 'BUSINESS_ERROR', metadata)
    this.name = 'BusinessException'
  }
}
