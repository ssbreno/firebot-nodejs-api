import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { BannerController } from './presentation/controllers/banner.controller'
import { BannerService } from './domain/services/banner.service'
import { ApiService } from './infrastructure/integrations/tibiadata.integration'
import { RespawnController } from './presentation/controllers/respawn.controller'
import { RespawnService } from './services/respawn.service'
import { FirebotIntegration } from './infrastructure/integrations/firebot.integration'

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [BannerController, RespawnController],
  providers: [BannerService, ApiService, RespawnService, FirebotIntegration],
})
export class ToolsModule {}
