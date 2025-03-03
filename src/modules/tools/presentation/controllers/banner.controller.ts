import { Controller, Get, HttpStatus, Query, Res, ValidationPipe } from '@nestjs/common'
import { BannerService } from '../../domain/services/banner.service'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { GenerateBannerDto } from '../../dto/banner.dto'

@ApiTags('Tools')
@Controller('tools')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get('guild')
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
  async getGuildBanner(
    @Query(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        whitelist: true,
      }),
    )
    query: GenerateBannerDto,
  ) {
    try {
      const { world, guild, ...options } = query
      return await this.bannerService.generateBanner(world, guild, options)
    } catch (error) {
      throw error
    }
  }
}
