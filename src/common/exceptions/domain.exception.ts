import { BaseException } from './base.exception'

export class DomainException extends BaseException {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 422, 'DOMAIN_ERROR', metadata)
    this.name = 'DomainException'
  }
}
