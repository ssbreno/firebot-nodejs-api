import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import * as sharp from 'sharp'
import { RespawnResponse, RashidLocation } from '../domain/types/respawn.types'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class RespawnService {
  constructor(private readonly httpService: HttpService) {}

  private async fetchRespawns(): Promise<RespawnResponse> {
    const { data } = await firstValueFrom(
      this.httpService.get<RespawnResponse>(`${process.env.FIREBOT_API_URL}/api/respawns/list-all`),
    )
    return data
  }

  private async fetchRashidLocation(): Promise<RashidLocation> {
    const { data } = await firstValueFrom(
      this.httpService.get<RashidLocation>(
        `${process.env.FIREBOT_API_URL}/api/gamedata/rashid-location`,
      ),
    )
    return data
  }

  private async createTextOverlay(text: string, width: number, height: number): Promise<Buffer> {
    const svg = `
      <svg width="${width}" height="${height}">
        <style>
          .title { fill: white; font-size: 24px; font-family: Arial; }
        </style>
        <text x="50%" y="50%" text-anchor="middle" class="title">${text}</text>
      </svg>
    `
    return Buffer.from(svg)
  }

  async generateRespawnImage(): Promise<Buffer> {
    const respawns = await this.fetchRespawns()
    const itemsPerRow = 4
    const itemWidth = 300
    const itemHeight = 200
    const padding = 20

    // Calculate grid dimensions
    const rows = Math.ceil(respawns.respawns.length / itemsPerRow)
    const totalWidth = itemWidth * itemsPerRow + padding * (itemsPerRow - 1)
    const totalHeight = itemHeight * rows + padding * (rows - 1)

    // Create base canvas
    const canvas = sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 30, g: 30, b: 30, alpha: 1 },
      },
    })

    // Create composite array for all items
    const composites = await Promise.all(
      respawns.respawns.map(async (respawn, index) => {
        const row = Math.floor(index / itemsPerRow)
        const col = index % itemsPerRow
        const x = col * (itemWidth + padding)
        const y = row * (itemHeight + padding)

        // Create item background
        const itemBg = await sharp({
          create: {
            width: itemWidth,
            height: itemHeight,
            channels: 4,
            background: { r: 50, g: 50, b: 50, alpha: 1 },
          },
        })
          .png()
          .toBuffer()

        // Create text overlay
        const textOverlay = await this.createTextOverlay(respawn.name, itemWidth, itemHeight)

        return [
          {
            input: itemBg,
            top: y,
            left: x,
          },
          {
            input: textOverlay,
            top: y,
            left: x,
          },
        ]
      }),
    )

    // Flatten composites array
    const flatComposites = composites.flat()

    // Generate final image
    return await canvas.composite(flatComposites).png().toBuffer()
  }

  async generateRashidImage(): Promise<Buffer> {
    const rashidInfo = await this.fetchRashidLocation()
    const width = 800
    const height = 400

    // Create base canvas
    const canvas = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 30, g: 30, b: 30, alpha: 1 },
      },
    })

    // Create text overlay
    const textOverlay = await this.createTextOverlay(
      `Rashid is in ${rashidInfo.city} today!`,
      width,
      height,
    )

    // Generate final image
    return await canvas
      .composite([
        {
          input: textOverlay,
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer()
  }
}
