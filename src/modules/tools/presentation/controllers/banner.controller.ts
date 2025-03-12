import { Controller, Get, HttpStatus, Query, Header } from '@nestjs/common'
import { BannerService } from '../../domain/services/banner.service'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { GenerateBannerDto } from '../../dto/banner.dto'

@ApiTags('Tools')
@Controller('tools')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get('guild')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Content-Type', 'image/png')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a guild banner image (PNG)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate banner',
  })
  async getGuildBanner(@Query() query: GenerateBannerDto) {
    try {
      const { world, guild, ...options } = query
      const pngBuffer = await this.bannerService.generateBanner(world, guild, options)

      return pngBuffer
    } catch (error) {
      throw error
    }
  }
}
