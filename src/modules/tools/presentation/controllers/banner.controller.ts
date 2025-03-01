import { Controller, Get, HttpStatus, Query, Res, ValidationPipe } from '@nestjs/common'
import { BannerService } from '../../domain/services/banner.service'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { GenerateBannerDto } from '../../dto/banner.dto'
import { FastifyReply } from 'fastify'

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
    @Res() res: FastifyReply,
  ) {
    try {
      const { world, guild, ...options } = query

      const banner = await this.bannerService.generateBanner(world, guild, options)

      res.headers({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="firebot-guild-${guild.toLowerCase().replace(/\s+/g, '-')}.png"`,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      })

      return res.send(banner)
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
      return res.send({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to generate banner',
      })
    }
  }
}
