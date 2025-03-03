import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { promises as fs } from 'fs'
import FormData from 'form-data'
import { WorldInfo, GuildInfo, BoostedBoss } from '../../domain/interfaces/banner.interface'

@Injectable()
export class ApiService {
  private readonly tibiaDataApi

  constructor(private readonly configService: ConfigService) {
    this.tibiaDataApi = axios.create({
      baseURL: this.configService.get('TIBIA_DATA_API') || 'https://api.tibiadata.com',
    })
  }

  async fetchWorldInfo(worldName: string): Promise<WorldInfo> {
    const response = await this.tibiaDataApi.get(`/v4/world/${worldName}`)
    return response.data
  }

  async fetchGuildInfo(guildName: string): Promise<GuildInfo> {
    const response = await this.tibiaDataApi.get(`/v4/guild/${guildName}`)
    return response.data
  }

  async fetchBoostedBosses(): Promise<BoostedBoss> {
    const response = await this.tibiaDataApi.get('/v4/boostablebosses')
    return response.data
  }

  async readImageAsBase64(filePath: string): Promise<string> {
    const imageBuffer = await fs.readFile(filePath)
    return imageBuffer.toString('base64')
  }

  async fetchImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(response.data)
  }

  async uploadToFreeImage(imageBuffer: Buffer): Promise<string> {
    try {
      const timestamp = Date.now()
      const formData = new FormData()

      formData.append('source', imageBuffer, {
        filename: `image-${timestamp}.png`,
        contentType: 'image/png',
      })
      formData.append('key', this.configService.get('FREEIMAGE_API_KEY'))

      const random = Math.random().toString(36).substring(7)
      const response = await axios.post('https://freeimage.host/api/1/upload', formData, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          ...formData.getHeaders(),
        },
      })

      return `${response.data.image.url}?v=${random}`
    } catch (error) {
      console.error('Error uploading to FreeImage:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }
  }

  async fetchRespawns(): Promise<any> {
    const response = await axios.get('https://api.firebot.run/api/respawns/list-all')
    return this.transformRespawns(response.data)
  }

  private transformRespawns(data: any): any {
    return data
  }
}
