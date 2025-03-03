import { Controller, Get, HttpStatus, Query, Res, ValidationPipe } from '@nestjs/common'
import { BannerService } from '../../domain/services/banner.service'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { GenerateBannerDto } from '../../dto/banner.dto'
import { Response } from 'express'
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
    @Query()
    query: GenerateBannerDto,
    @Res() response: Response, // Fixed parameter name and ensure proper typing
  ) {
    try {
      const { world, guild, ...options } = query
      const pngBuffer = await this.bannerService.generateBanner(world, guild, options)

      response.type('image/svg+xml')
      response.send(pngBuffer)
    } catch (error) {
      throw error
    }
  }
}
