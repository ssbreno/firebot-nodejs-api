export const LOG_LEVEL = process.env.LOG_LEVEL || 'debug'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const PORT = process.env.PORT || 3000

// API
export const API_PREFIX = process.env.API_PREFIX || '/api'
export const API_VERSION = process.env.API_VERSION || '1'
export const HOST = process.env.HOST || '0.0.0.0'

// Database
export const DATABASE_HOST = process.env.DATABASE_HOST || 'localhost'
export const DATABASE_PORT = process.env.DATABASE_PORT || 5432
export const DATABASE_NAME = process.env.DATABASE_NAME || 'nestjs_db'
export const DATABASE_USER = process.env.DATABASE_USER || 'postgres'
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'postgres'
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`

// Redis
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
export const REDIS_PORT = process.env.REDIS_PORT || 6379
export const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`

// Cache
export const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10)
export const CACHE_MAX_ITEMS = parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10)

// Swagger
export const SWAGGER_PREFIX = process.env.SWAGGER_PREFIX || '/docs'

// Queue
export const QUEUE_PREFIX = process.env.QUEUE_PREFIX || 'nestjs_queue'
