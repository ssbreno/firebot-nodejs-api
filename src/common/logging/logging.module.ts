import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import * as winston from 'winston'

import { WinstonLogger, LoggerOptions } from './winston.logger'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: WinstonLogger,
      useFactory: (configService: ConfigService) => {
        const env = configService.get('NODE_ENV') || 'development'
        const isProd = env === 'production'

        const options: LoggerOptions = {
          level: configService.get('LOG_LEVEL') || (isProd ? 'info' : 'debug'),
          silent: configService.get('LOG_SILENT') === 'true',
          format: winston.format.combine(
            winston.format.timestamp(),
            isProd
              ? winston.format.json()
              : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.printf(
                    ({
                      timestamp,
                      level,
                      message,
                      context,
                      ...meta
                    }: winston.Logform.TransformableInfo) => {
                      const ctx = (context as string | undefined) || '-'
                      const metaStr = Object.keys(meta).length
                        ? '\n' + JSON.stringify(meta, null, 2)
                        : ''
                      return `${String(timestamp)} [${String(level)}] [${ctx}] ${String(message)}${metaStr}`
                    },
                  ),
                ),
          ),
        }

        return new WinstonLogger('AppLogger', options)
      },
      inject: [ConfigService],
    },
  ],
  exports: [WinstonLogger],
})
export class LoggingModule {}
