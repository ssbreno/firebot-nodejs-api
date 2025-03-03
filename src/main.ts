import compress from '@fastify/compress'
import helmet from '@fastify/helmet'
import {
  ClassSerializerInterceptor,
  INestApplication,
  Logger,
  LogLevel,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { useContainer } from 'class-validator'
import { AppModule } from './app.module'
import { PORT, PROJECT_DESCRIPTION, PROJECT_NAME, PROJECT_VERSION } from './common/constants'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { WinstonLogger } from './common/logging'

const DEFAULT_API_PREFIX = '/api'
const DEFAULT_API_VERSION = '1'
const DEFAULT_SWAGGER_PREFIX = '/docs'
const DEFAULT_LOG_LEVEL = 'debug'
/**
 * Setup the Swagger (UI).
 * @param app
 */
export const setupSwagger = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle(PROJECT_NAME)
    .setDescription(PROJECT_DESCRIPTION)
    .setVersion(PROJECT_VERSION)
    .build()

  const document = SwaggerModule.createDocument(app, options)
  const path = process.env.SWAGGER_PREFIX || DEFAULT_SWAGGER_PREFIX

  SwaggerModule.setup(path, app, document)
}

/**
 * Bootstrap the app.
 */
async function bootstrap() {
  const logLevel = (process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL) as LogLevel
  const logger = new Logger('Bootstrap')

  const fastifyAdapter = new FastifyAdapter({
    ignoreTrailingSlash: true,
  })

  const apiPrefix = process.env.API_PREFIX || DEFAULT_API_PREFIX
  const apiVersion = process.env.API_VERSION || DEFAULT_API_VERSION

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    logger: process.env.LOG_SILENT === 'true' ? false : [logLevel],
    abortOnError: false,
  })

  app.useLogger(app.get(WinstonLogger))
  app.enableCors()
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  })

  app.setGlobalPrefix(apiPrefix)

  setupSwagger(app)
  useContainer(app.select(AppModule), { fallbackOnErrors: true })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get<Reflector>(Reflector)))

  await app.listen(PORT, '0.0.0.0')

  logger.log(`Application is running on: ${await app.getUrl()}`)
}

bootstrap()
