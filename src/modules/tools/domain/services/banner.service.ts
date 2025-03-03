import { Injectable } from '@nestjs/common'
import { join } from 'path'
import * as Sharp from 'sharp'
import { ApiService } from '../../infrastructure/services/api.service'
import { translations } from '../../config/constants'
import {
  BannerAssets,
  BannerData,
  BannerOptions,
  Translations,
} from '../interfaces/banner.interface'

@Injectable()
export class BannerService {
  constructor(private readonly apiService: ApiService) {}

  /**
   * Generate a dynamic banner for a guild with advanced styling
   */
  async generateBanner(
    world: string,
    guildName: string,
    options: BannerOptions = {},
  ): Promise<Buffer> {
    try {
      const {
        lang = 'pt',
        theme = 'firebot',
        showBoss = true,
        showLogo = true,
        width = 1200,
        height = 300,
      } = options

      const t = translations[lang] || translations.pt
      const assets = await this.loadAssets(theme)
      const data = await this.fetchData(world, guildName)

      // Only fetch boss image if enabled in options
      const bossImage = showBoss ? await this.getBossImage(data.boosted) : null

      // Calculate online percentage
      const onlinePercentage = Math.round(
        (data.guildInfo.guild.players_online / data.guildInfo.guild.members_total) * 100,
      )

      // MÉTODO 1: Criar uma imagem única com todos os elementos, incluindo texto
      // Esta abordagem desenha texto diretamente na imagem usando composites
      const fullSVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3c0000;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
          </linearGradient>

          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#240000;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
          </linearGradient>

          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="roundedCorners">
            <rect width="${width}" height="${height}" rx="5" ry="5" />
          </clipPath>
        </defs>

        <!-- Background with black and red gradient -->
        <g clip-path="url(#roundedCorners)">
          <rect width="100%" height="100%" fill="url(#bgGradient)"/>

          <!-- Header bar -->
          <rect width="100%" height="${height * 0.12}" fill="url(#headerGradient)"/>

          <!-- Main content area -->
          <rect x="10" y="${height * 0.14}" width="${width * 0.62}" height="${height * 0.82}"
                rx="4" ry="4" fill="rgba(10, 10, 10, 0.9)" filter="url(#dropShadow)"/>

          <!-- Stats panel area -->
          <rect x="${width * 0.64 + 10}" y="${height * 0.14}" width="${width * 0.35 - 20}" height="${height * 0.82}"
                rx="4" ry="4" fill="rgba(10, 10, 10, 0.9)" filter="url(#dropShadow)"/>

          <!-- Progress bar for online members with firebot colors -->
          <rect x="${width * 0.02}" y="${height * 0.26}" width="${width * 0.58}" height="${height * 0.06}" rx="3" ry="3" fill="#222222" />
          <rect x="${width * 0.02}" y="${height * 0.26}" width="${width * 0.58 * (onlinePercentage / 100)}" height="${height * 0.06}" rx="3" ry="3" fill="#750000" />
        </g>
      </svg>`

      // Converter o SVG base em uma imagem
      const baseImage = await Sharp(Buffer.from(fullSVG)).png().toBuffer()

      // Preparar composições para adicionar à imagem base
      const composites = []

      // MÉTODO 2: Usar TextOnImage para adicionar texto básico diretamente
      // Vamos desenhar textos diretamente usando Sharp com texto sobreposto
      // Criar uma imagem com os textos

      // Textos importantes no banner - apenas ASCII básico para testes
      const texts = [
        {
          text: `${data.worldInfo.world.name} (${data.worldInfo.world.pvp_type})`,
          fontSize: 24,
          x: 20,
          y: 30,
          color: 'white',
        },
        {
          text: `Guild: ${data.guildInfo.guild.name}`,
          fontSize: 20,
          x: Math.round(width * 0.65) + 20,
          y: 30,
          color: 'white',
        },
        {
          text: `${t.membersOnline}: ${data.guildInfo.guild.players_online}/${data.guildInfo.guild.members_total} (${onlinePercentage}%)`,
          fontSize: 18,
          x: 20,
          y: Math.round(height * 0.3),
          color: 'white',
        },
        {
          text: `${t.playersOnline}: ${data.worldInfo.world.players_online}`,
          fontSize: 16,
          x: 20,
          y: Math.round(height * 0.5),
          color: '#00cc44',
        },
        {
          text: `${t.record}: ${data.worldInfo.world.record_players}`,
          fontSize: 16,
          x: 20,
          y: Math.round(height * 0.6),
          color: '#ffaa00',
        },
        {
          text: data.worldInfo.world.location,
          fontSize: 16,
          x: 20,
          y: Math.round(height * 0.7),
          color: '#ff3333',
        },
        {
          text: 'https://firebot.run',
          fontSize: 16,
          x: Math.round(width * 0.31),
          y: Math.round(height * 0.9),
          color: '#ff3333',
        },
        {
          text: `${t.boostedBoss}:`,
          fontSize: 18,
          x: Math.round(width * 0.65) + 20,
          y: Math.round(height * 0.5),
          color: 'white',
        },
        {
          text: data.boosted?.boostable_bosses?.boosted?.name || 'N/A',
          fontSize: 16,
          x: Math.round(width * 0.65) + 20,
          y: Math.round(height * 0.56),
          color: '#ff3333',
        },
        {
          text: 'TESTE DIRETO DE TEXTO',
          fontSize: 28,
          x: Math.round(width * 0.3),
          y: Math.round(height * 0.8),
          color: 'yellow',
        },
      ]

      // Para cada texto, criar uma imagem de texto simples
      for (const textItem of texts) {
        const textSvg = `
        <svg width="${width}" height="${Math.round(textItem.fontSize * 2)}">
          <text
            x="${Math.round(textItem.x)}"
            y="${Math.round(textItem.fontSize * 1.2)}"
            font-family="Arial, sans-serif"
            font-size="${textItem.fontSize}px"
            fill="${textItem.color}"
          >${this.escapeXml(textItem.text)}</text>
        </svg>`

        const textBuffer = await Sharp(Buffer.from(textSvg)).png().toBuffer()

        composites.push({
          input: textBuffer,
          top: Math.round(textItem.y - textItem.fontSize),
          left: 0,
        })
      }

      // Add logo if needed
      if (showLogo && assets.fbotImageBase64) {
        const logoBuffer = Buffer.from(assets.fbotImageBase64, 'base64')

        // Resize the logo to appropriate dimensions
        const resizedLogo = await Sharp(logoBuffer)
          .resize({ width: 100, height: 80, fit: 'inside' })
          .toBuffer()

        composites.push({
          input: resizedLogo,
          top: Math.round(height * 0.25),
          left: Math.round(width * 0.78),
        })
      }

      // Add boss image if available
      if (bossImage) {
        // Resize boss image
        const resizedBoss = await Sharp(bossImage)
          .resize({ width: 80, height: 80, fit: 'inside' })
          .toBuffer()

        composites.push({
          input: resizedBoss,
          top: Math.round(height * 0.6),
          left: Math.round(width * 0.65) + 20,
        })
      }

      // Combine all layers
      return await Sharp(baseImage).composite(composites).png().toBuffer()
    } catch (error) {
      console.error('Banner generation error:', error)
      throw new Error(`Banner generation failed: ${error.message}`)
    }
  }

  /**
   * Load assets based on the selected theme
   */
  private async loadAssets(theme: string = 'firebot'): Promise<BannerAssets> {
    try {
      const possiblePaths = [
        join(process.cwd(), 'src/assets/images'),
        join(process.cwd(), 'dist/src/assets/images'),
        '/app/src/assets/images',
        '/app/dist/src/assets/images',
      ]

      let fbotImageBase64: string | null = null
      let backgroundImageBase64: string | null = null

      // Try to load theme-specific assets
      const logoFile = `logo-${theme}.png`
      const backgroundFile = `background-${theme}.png`

      for (const basePath of possiblePaths) {
        try {
          // Try theme-specific assets first, fall back to defaults
          ;[fbotImageBase64, backgroundImageBase64] = await Promise.all([
            this.apiService
              .readImageAsBase64(join(basePath, logoFile))
              .catch(() => this.apiService.readImageAsBase64(join(basePath, 'logo.png'))),
            this.apiService
              .readImageAsBase64(join(basePath, backgroundFile))
              .catch(() => this.apiService.readImageAsBase64(join(basePath, 'image.png'))),
          ])

          if (fbotImageBase64 && backgroundImageBase64) break
        } catch (e) {
          console.log(`Failed to load assets from ${basePath}:`, e.message)
          continue
        }
      }

      if (!fbotImageBase64 || !backgroundImageBase64) {
        throw new Error('Failed to load required assets')
      }

      return { fbotImageBase64, backgroundImageBase64 }
    } catch (error) {
      throw new Error(`Asset loading failed: ${error.message}`)
    }
  }

  /**
   * Fetch all necessary data for the banner
   */
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

  /**
   * Get the boss image for overlay
   */
  private async getBossImage(boosted: any): Promise<Buffer | null> {
    try {
      if (!boosted?.boostable_bosses?.boosted?.image_url) {
        return null
      }

      const imageBuffer = await this.apiService.fetchImage(
        boosted.boostable_bosses.boosted.image_url,
      )

      // Validate and process image
      await Sharp(imageBuffer).metadata()

      // Process with transparent background
      return await Sharp(imageBuffer)
        .removeAlpha()
        .ensureAlpha(0.9) // Add semi-transparency
        .png()
        .toBuffer()
    } catch (error) {
      console.warn('Boss image processing failed:', error)
      return null
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    if (!unsafe) return ''

    // First ensure we're dealing with a string
    const text = String(unsafe)

    // Replace XML special characters
    return text.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<':
          return '&lt;'
        case '>':
          return '&gt;'
        case '&':
          return '&amp;'
        case "'":
          return '&apos;'
        case '"':
          return '&quot;'
        default:
          return c
      }
    })
  }
}
