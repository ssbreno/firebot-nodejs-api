import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { HttpArgumentsHost } from '@nestjs/common/interfaces'
import { FastifyReply, FastifyRequest } from 'fastify'
import { getErrorCode, getErrorMessage } from './error.utils'
import { BaseException } from '../exceptions/base.exception'
import { BusinessException } from '../exceptions/business.exception'
import { DomainException } from '../exceptions/domain.exception'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(HttpExceptionFilter.name)

  public catch(exception: any, host: ArgumentsHost): void {
    const ctx: HttpArgumentsHost = host.switchToHttp()
    const request = ctx.getRequest<FastifyRequest>()
    const response = ctx.getResponse<FastifyReply>()

    let statusCode: number
    let status: string
    let message: string | Array<string>
    let code: string = 'UNKNOWN'
    let metadata: Record<string, any> = {}

    if (exception instanceof BaseException) {
      statusCode = exception.statusCode
      message = exception.message
      code = exception.errorCode || code
      metadata = exception.metadata || {}
      status = getErrorCode(exception.message)
    } else if (exception instanceof BusinessException) {
      statusCode = HttpStatus.BAD_REQUEST
      message = exception.message
      code = exception.errorCode || 'BUSINESS_ERROR'
      metadata = exception.metadata || {}
      status = 'BUSINESS_ERROR'
    } else if (exception instanceof DomainException) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY
      message = exception.message
      code = 'DOMAIN_ERROR'
      status = 'DOMAIN_ERROR'
    } else if (exception instanceof NotFoundException) {
      statusCode = HttpStatus.NOT_FOUND
      message = exception.message
      status = 'NOT_FOUND'
    } else if (exception instanceof UnauthorizedException) {
      statusCode = HttpStatus.UNAUTHORIZED
      message = exception.message
      status = 'UNAUTHORIZED'
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      status = getErrorCode(exception.getResponse())
      message = getErrorMessage(exception.getResponse())
    } else {
      const type: string | undefined = exception?.type
      statusCode =
        type === 'entity.too.large'
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : HttpStatus.INTERNAL_SERVER_ERROR
      status = HttpStatus[statusCode]
      message =
        type === 'entity.too.large'
          ? `Your request entity size is too big for the server to process it:
           - request size: ${exception?.length};
           - request limit: ${exception?.limit}.`
          : 'An internal server error occurred, please contact support.'
    }

    const exceptionStack: string = 'stack' in exception ? exception.stack : ''
    const requestId = request.headers['x-request-id']
    const logContext = {
      requestId,
      path: request.url,
      method: request.method,
      headers: request.headers,
      ...metadata,
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          message: `${statusCode} [${request.method} ${request.url}] has thrown a critical error`,
          code,
          status,
          ...logContext,
        },
        exceptionStack,
      )
    } else if (statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn({
        message: `${statusCode} [${request.method} ${request.url}] has thrown an HTTP client error`,
        code,
        status,
        ...logContext,
      })
    }

    response.status(statusCode).send({
      statusCode,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })
  }
}
