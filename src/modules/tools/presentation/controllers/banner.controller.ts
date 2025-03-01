import { Controller, Get, Param, Query, Res } from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { BannerService } from '../../domain/services/banner.service'
import { ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger'

@ApiTags('Tools')
@Controller('tools')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get('banner/:world/:guildName')
  @ApiParam({ name: 'world', description: 'Tibia world name' })
  @ApiParam({ name: 'guildName', description: 'Guild name' })
  @ApiQuery({
    name: 'lang',
    enum: ['pt', 'en'],
    required: false,
    description: 'Language for banner text',
  })
  async generateTS3Banner(
    @Param('world') world: string,
    @Param('guildName') guildName: string,
    @Query('lang') lang = 'pt',
    @Res() res: FastifyReply,
  ): Promise<void> {
    try {
      const finalImage = await this.bannerService.generateBanner(world, guildName, lang)

      res.headers({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
        'Last-Modified': new Date().toUTCString(),
        ETag: Math.random().toString(36).substring(7),
        'Content-Type': 'image/png',
      })

      return res.send(finalImage)
    } catch (error) {
      throw new Error(`Failed to generate TS3 banner: ${error.message}`)
    }
  }
}
