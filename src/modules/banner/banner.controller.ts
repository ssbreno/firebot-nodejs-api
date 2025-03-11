import { Controller, Post, Body, Res } from '@nestjs/common'
import { BannerService } from './banner.service'
import { Response } from 'express'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

@ApiTags('banner')
@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a banner with text' })
  @ApiResponse({ status: 200, description: 'Returns the generated banner image' })
  async generateBanner(@Body() body: { text: string }, @Res() res: Response): Promise<void> {
    const buffer = await this.bannerService.generateBanner(body.text)
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
    })
    res.send(buffer)
  }
}
