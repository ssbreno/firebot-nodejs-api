import { Injectable } from '@nestjs/common'
import { join } from 'path'
import * as Sharp from 'sharp'
import { ApiService } from '../../infrastructure/services/api.service'
import { translations } from '../../config/constants'
import { BannerAssets, BannerData, Translations } from '../interfaces/banner.interface'

@Injectable()
export class BannerService {
  constructor(private readonly apiService: ApiService) {}

  async generateBanner(world: string, guildName: string, lang = 'pt'): Promise<Buffer> {
    try {
      const t = translations[lang] || translations.pt
      const assets = await this.loadAssets()
      const data = await this.fetchData(world, guildName)
      const bossImage = await this.getBossImage(data.boosted)

      const svg = this.generateSVG(assets, data, t)
      return await this.createFinalImage(svg, bossImage)
    } catch (error) {
      console.error('Banner generation error:', error)
      throw new Error(`Banner generation failed: ${error.message}`)
    }
  }

  private async loadAssets(): Promise<BannerAssets> {
    try {
      const [fbotImageBase64, backgroundImageBase64] = await Promise.all([
        this.apiService.readImageAsBase64(join(process.cwd(), 'src/assets/images/logo.png')),
        this.apiService.readImageAsBase64(join(process.cwd(), 'src/assets/images/image.png')),
      ])

      if (!fbotImageBase64 || !backgroundImageBase64) {
        throw new Error('Failed to load required assets')
      }

      return { fbotImageBase64, backgroundImageBase64 }
    } catch (error) {
      throw new Error(`Asset loading failed: ${error.message}`)
    }
  }

  private async fetchData(world: string, guildName: string): Promise<BannerData> {
    try {
      if (!world) throw new Error('World parameter is required')
      if (!guildName) throw new Error('Guild name parameter is required')

      const [worldInfo, guildInfo, boosted] = await Promise.all([
        this.apiService.fetchWorldInfo(world),
        this.apiService.fetchGuildInfo(guildName),
        this.apiService.fetchBoostedBosses(),
      ])

      if (!worldInfo?.world) throw new Error('World info not found')
      if (!guildInfo?.guild) throw new Error('Guild info not found')

      return { worldInfo, guildInfo, boosted }
    } catch (error) {
      throw new Error(`Data fetching failed: ${error.message}`)
    }
  }

  private async getBossImage(boosted: any): Promise<Buffer | null> {
    try {
      if (!boosted?.boostable_bosses?.boosted?.image_url) {
        return null
      }

      const imageBuffer = await this.apiService.fetchImage(
        boosted.boostable_bosses.boosted.image_url,
      )
      await Sharp(imageBuffer).metadata()

      return await Sharp(imageBuffer).png().toBuffer()
    } catch (error) {
      console.warn('Boss image processing failed:', error)
      return null
    }
  }

  private generateSVG(assets: BannerAssets, data: BannerData, t: Translations[string]): string {
    try {
      const { fbotImageBase64, backgroundImageBase64 } = assets
      const { worldInfo, guildInfo, boosted } = data

      if (!worldInfo || !guildInfo) {
        throw new Error('Missing required data for SVG generation')
      }

      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200">
        <defs>
          <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#a37718;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#54080e;stop-opacity:1" />
          </linearGradient>
        </defs>

        <image href="data:image/png;base64,${backgroundImageBase64}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/>
        <rect width="100%" height="100%" fill="#000000" opacity="0.7"/>
        <rect width="100%" height="40" fill="url(#headerGradient)"/>
        <text x="10" y="25" font-family="Comic, sans-serif" font-size="14" fill="#ffffff">
          ${t.membersOnline}: (${guildInfo.guild.players_online}/${guildInfo.guild.members_total})
        </text>
        <text x="500" y="25" font-family="Comic, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">
          https://firebot.run
        </text>
        <text x="700" y="25" font-family="Comic, sans-serif" font-size="14" fill="#ffffff">
          ${t.boostedBoss}: ${boosted?.boostable_bosses?.boosted?.name || 'N/A'}
        </text>
        <text x="20" y="80" font-family="Comic, sans-serif" font-size="36" font-weight="bold" fill="#ffffff">
          ${guildInfo.guild.name}
        </text>
        <text x="20" y="120" font-family="Comic, sans-serif" font-size="24" fill="#b0bec5">
          ${worldInfo.world.name}
        </text>
        <text x="20" y="150" font-family="Comic, sans-serif" font-size="18" fill="#64b5f6">
          ${worldInfo.world.pvp_type}
        </text>
        <text x="20" y="180" font-family="Comic, sans-serif" font-size="16" fill="#4caf50">
          ${t.playersOnline}: ${worldInfo.world.players_online}
        </text>
        <text x="250" y="180" font-family="Comic, sans-serif" font-size="16" fill="#ff9800">
          ${t.record}: ${worldInfo.world.record_players}
        </text>
        <text x="450" y="180" font-family="Comic, sans-serif" font-size="16" fill="#e91e63">
          ${worldInfo.world.location}
        </text>
        ${
          fbotImageBase64
            ? `
          <a href="https://firebot.run" target="_blank">
            <image href="data:image/png;base64,${fbotImageBase64}" x="800" y="50" width="180" height="140"/>
          </a>
        `
            : ''
        }
      </svg>`
    } catch (error) {
      throw new Error(`SVG generation failed: ${error.message}`)
    }
  }

  private async createFinalImage(svg: string, bossImage: Buffer | null): Promise<Buffer> {
    try {
      const svgBuffer = Buffer.from(svg)
      let image = Sharp(svgBuffer)

      if (bossImage) {
        image = image.composite([
          {
            input: bossImage,
            top: 55,
            left: 730,
          },
        ])
      }

      return await image.png().toBuffer()
    } catch (error) {
      throw new Error(`Final image creation failed: ${error.message}`)
    }
  }
}
