import { BaseException } from './base.exception'

export class NotFoundException extends BaseException {
  constructor(resource: string, metadata?: Record<string, any>) {
    super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', metadata)
    this.name = 'NotFoundException'
  }
}
