import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { BannerController } from './presentation/controllers/banner.controller'
import { BannerService } from './domain/services/banner.service'
import { ApiService } from './infrastructure/services/api.service'
import { RespawnController } from './presentation/controllers/respawn.controller'
import { RespawnService } from './services/respawn.service'

@Module({
  imports: [HttpModule],
  controllers: [BannerController, RespawnController],
  providers: [BannerService, ApiService, RespawnService],
})
export class ToolsModule {}
