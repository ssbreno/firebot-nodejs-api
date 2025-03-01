import { Module } from '@nestjs/common'
import { BannerController } from './presentation/controllers/banner.controller'
import { BannerService } from './domain/services/banner.service'
import { ApiService } from './infrastructure/services/api.service'

@Module({
  controllers: [BannerController],
  providers: [BannerService, ApiService],
})
export class ToolsModule {}
