import { CacheModuleOptions } from '@nestjs/cache-manager'
import { ConfigService } from '@nestjs/config'
import { redisStore } from 'cache-manager-redis-store'

export const redisConfig = async (configService: ConfigService): Promise<CacheModuleOptions> => {
  return {
    store: redisStore,
    host: configService.get('REDIS_HOST'),
    port: configService.get('REDIS_PORT'),
    password: configService.get('REDIS_PASSWORD'),
    username: configService.get('REDIS_USERNAME'),
    ttl: configService.get('CACHE_TTL'),
    max: configService.get('CACHE_MAX_ITEMS'),
  }
}
