import { Controller, Get, Res, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { RespawnService } from '../../services/respawn.service'

@ApiTags('Tools')
@Controller('tools')
export class RespawnController {
  constructor(private readonly respawnService: RespawnService) {}

  @Get('respawns/image')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a PNG image of all respawns',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate respawn image',
  })
  async getRespawnImage(@Res() response: Response) {
    try {
      const pngBuffer = await this.respawnService.generateRespawnImage()

      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.setHeader('Pragma', 'no-cache')
      response.setHeader('Expires', '0')
      response.type('image/png')
      response.send(pngBuffer)
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate respawn image',
        error: error.message,
      })
    }
  }
}
