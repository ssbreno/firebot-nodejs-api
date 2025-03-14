import { Controller, Get, Res, HttpStatus, Header } from '@nestjs/common'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { RespawnService } from '../../domain/services/respawn.service'

@ApiTags('Tools')
@Controller('tools')
export class RespawnController {
  constructor(private readonly respawnService: RespawnService) {}

  @Get('respawns/image')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @Header('Content-Type', 'image/png')
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
      response.send(pngBuffer)
    } catch (error) {
      console.error('Error in respawn controller:', error)
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Failed to generate respawn image',
        error: error.message,
      })
    }
  }
}
