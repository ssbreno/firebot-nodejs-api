import { Controller, Post, Body, Header } from '@nestjs/common'
import { BannerService } from './banner.service'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

@ApiTags('banner')
@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a banner with text' })
  @ApiResponse({ status: 200, description: 'Returns the generated banner image' })
  @Header('Content-Type', 'image/png')
  async generateBanner(@Body() body: { text: string }): Promise<Buffer> {
    const buffer = await this.bannerService.generateBanner(body.text)
    return buffer
  }
}
