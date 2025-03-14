import { LoggerService } from '@nestjs/common'
import * as winston from 'winston'

import { nestConsoleFormat, severity } from './winston.formats'

export interface LoggerOptions {
  level?: string
  silent?: boolean
  format?: winston.Logform.Format
  transports?: winston.transport[]
}

export class WinstonLogger implements LoggerService {
  private readonly logger: winston.Logger
  private context?: string

  constructor(context?: string, options?: LoggerOptions) {
    this.context = context

    this.logger = winston.createLogger({
      level: options?.level || 'info',
      silent: options?.silent || false,
      format:
        options?.format ||
        winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          severity({ upperCase: true }),
          nestConsoleFormat(),
        ),
      transports: options?.transports || [new winston.transports.Console()],
    })
  }

  /**
   * Set the context for the logger
   */
  public setContext(context: string): void {
    this.context = context
  }

  /**
   * Log an info message
   */
  public log(message: any, context?: string): void {
    this.callLoggerMethod('info', message, context)
  }

  /**
   * Log an error message
   */
  public error(message: any, trace?: string, context?: string): void {
    const meta: Record<string, any> = {}
    let actualMessage: string

    if (message instanceof Error) {
      actualMessage = message.message
      meta.stack = trace || message.stack
    } else if (typeof message === 'object' && message !== null) {
      const { message: msg, ...rest } = message
      actualMessage = (msg as string) || 'Error'
      Object.assign(meta, rest)
      if (trace) meta.stack = trace
    } else {
      actualMessage = message
      if (trace) meta.stack = trace
    }

    this.logger.error(actualMessage, {
      context: context || this.context,
      ...meta,
    })
  }

  /**
   * Log a warning message
   */
  public warn(message: any, context?: string): void {
    this.callLoggerMethod('warn', message, context)
  }

  /**
   * Log a debug message
   */
  public debug(message: any, context?: string): void {
    this.callLoggerMethod('debug', message, context)
  }

  /**
   * Log a verbose message
   */
  public verbose(message: any, context?: string): void {
    this.callLoggerMethod('verbose', message, context)
  }

  /**
   * Call the appropriate logger method with type safety
   */
  private callLoggerMethod(
    methodName: 'info' | 'warn' | 'debug' | 'verbose',
    message: any,
    context?: string,
  ): void {
    if (typeof message === 'object' && message !== null && 'message' in message) {
      const { message: msg, ...meta } = message
      this.logger[methodName]((msg as string) || methodName, {
        context: context || this.context,
        ...meta,
      })
    } else {
      this.logger[methodName](message, {
        context: context || this.context,
      })
    }
  }
}
