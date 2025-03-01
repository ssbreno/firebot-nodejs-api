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

      // Generate SVG with dynamic sizing and theme
      const svg = this.generateSVG(assets, data, t, {
        width,
        height,
        theme,
        showLogo,
        showBoss,
      })

      return await this.createFinalImage(svg, bossImage, { width, height })
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
   * Generate the SVG with advanced styling
   */
  private generateSVG(
    assets: BannerAssets,
    data: BannerData,
    t: Translations[string],
    options: {
      width: number
      height: number
      theme: string
      showLogo: boolean
      showBoss: boolean
    },
  ): string {
    try {
      const { fbotImageBase64 } = assets
      const { worldInfo, guildInfo, boosted } = data
      const { width, height, showLogo } = options

      if (!worldInfo || !guildInfo) {
        throw new Error('Missing required data for SVG generation')
      }

      // Firebot theme-specific colors - black and red
      const colors = {
        gradientStart: '#3c0000',
        gradientEnd: '#000000',
        headerBg: '#1a0000',
        mainBg: 'rgba(0, 0, 0, 0.9)',
        contentBg: 'rgba(10, 10, 10, 0.9)',
        primaryText: '#ffffff',
        secondaryText: '#bbbbbb',
        accentText: '#ff3333',
        successText: '#00cc44',
        warningText: '#ffaa00',
        dangerText: '#ff3333',
        progressBarBg: '#222222',
        progressBarFill: '#750000',
      }

      // Calculate online percentage
      const onlinePercentage = Math.round(
        (guildInfo.guild.players_online / guildInfo.guild.members_total) * 100,
      )

      // Build the SVG with black and red theme
      return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${colors.gradientStart};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.gradientEnd};stop-opacity:1" />
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

          <!-- Main content area - now just using colors instead of image -->
          <rect x="10" y="${height * 0.14}" width="${width * 0.62}" height="${height * 0.82}"
                rx="4" ry="4" fill="${colors.contentBg}" filter="url(#dropShadow)"/>

          <!-- Stats panel area -->
          <rect x="${width * 0.64 + 10}" y="${height * 0.14}" width="${width * 0.35 - 20}" height="${height * 0.82}"
                rx="4" ry="4" fill="${colors.contentBg}" filter="url(#dropShadow)"/>
        </g>

        <!-- Header content -->
        <text x="${width * 0.01}" y="${height * 0.08}" font-family="Arial, sans-serif" font-size="${height * 0.05}" font-weight="bold" fill="${colors.primaryText}">
          ${worldInfo.world.name} (${worldInfo.world.pvp_type})
        </text>

        <!-- Guild Name in stat panel -->
        <text x="${width * 0.65 + 20}" y="${height * 0.08}" font-family="Arial, sans-serif" font-size="${height * 0.04}" text-anchor="start" fill="${colors.primaryText}">
          ${guildInfo.guild.name}
        </text>

        <!-- Main guild info -->
        <text x="${width * 0.02}" y="${height * 0.23}" font-family="Arial, sans-serif" font-size="${height * 0.05}" font-weight="bold" fill="${colors.primaryText}">
          ${t.membersOnline}:
        </text>

        <!-- Progress bar for online members with firebot colors -->
        <rect x="${width * 0.02}" y="${height * 0.26}" width="${width * 0.58}" height="${height * 0.06}" rx="3" ry="3" fill="${colors.progressBarBg}" />
        <rect x="${width * 0.02}" y="${height * 0.26}" width="${width * 0.58 * (onlinePercentage / 100)}" height="${height * 0.06}" rx="3" ry="3" fill="${colors.progressBarFill}" />
        <text x="${width * 0.31}" y="${height * 0.3}" font-family="Arial, sans-serif" font-size="${height * 0.04}" text-anchor="middle" fill="${colors.primaryText}" font-weight="bold">
          ${guildInfo.guild.players_online}/${guildInfo.guild.members_total} (${onlinePercentage}%)
        </text>

        <!-- Guild foundation date if available -->
        ${
          guildInfo.guild.founded
            ? `
        <text x="${width * 0.02}" y="${height * 0.38}" font-family="Arial, sans-serif" font-size="${height * 0.035}" fill="${colors.secondaryText}">
          ${t.founded || 'Fundado em'}: ${guildInfo.guild.founded}
        </text>
        `
            : ''
        }

        <!-- Guild description if available -->
        ${
          guildInfo.guild.description
            ? `
        <text x="${width * 0.02}" y="${height * 0.46}" font-family="Arial, sans-serif" font-size="${height * 0.03}" fill="${colors.accentText}">
          "${guildInfo.guild.description.substring(0, 100)}${guildInfo.guild.description.length > 100 ? '...' : ''}"
        </text>
        `
            : ''
        }

        <!-- World stats section -->
        <text x="${width * 0.02}" y="${height * 0.56}" font-family="Arial, sans-serif" font-size="${height * 0.035}" fill="${colors.successText}">
          ${t.playersOnline}: ${worldInfo.world.players_online}
        </text>

        <text x="${width * 0.02}" y="${height * 0.64}" font-family="Arial, sans-serif" font-size="${height * 0.035}" fill="${colors.warningText}">
          ${t.record}: ${worldInfo.world.record_players}
        </text>

        <text x="${width * 0.02}" y="${height * 0.72}" font-family="Arial, sans-serif" font-size="${height * 0.035}" fill="${colors.dangerText}">
          ${worldInfo.world.location}
        </text>

        <!-- Footer with firebot branding -->
        <text x="${width * 0.31}" y="${height * 0.9}" font-family="Arial, sans-serif" font-size="${height * 0.035}" text-anchor="middle" fill="${colors.accentText}">
          https://firebot.run
        </text>

        <!-- Boosted boss info -->
        <text x="${width * 0.65 + 20}" y="${height * 0.5}" font-family="Arial, sans-serif" font-size="${height * 0.04}" font-weight="bold" fill="${colors.primaryText}">
          ${t.boostedBoss}:
        </text>

        <text x="${width * 0.65 + 20}" y="${height * 0.56}" font-family="Arial, sans-serif" font-size="${height * 0.035}" fill="${colors.accentText}">
          ${boosted?.boostable_bosses?.boosted?.name || 'N/A'}
        </text>

        <!-- Image placeholder for boss - real image added via Sharp composite -->
        ${
          options.showBoss
            ? `
        <rect x="${width * 0.65 + 20}" y="${height * 0.6}" width="80" height="80" fill="transparent" id="bossImagePlaceholder" />
        `
            : ''
        }

        <!-- Logo image - smaller size for better proportion -->
        ${
          showLogo
            ? `
        <a href="https://firebot.run" target="_blank">
          <image href="data:image/png;base64,${fbotImageBase64}" x="${width * 0.78}" y="${height * 0.25}" width="100" height="80"/>
        </a>
        `
            : ''
        }
      </svg>`
    } catch (error) {
      throw new Error(`SVG generation failed: ${error.message}`)
    }
  }

  /**
   * Create the final image with boss overlay if available
   */
  private async createFinalImage(
    svg: string,
    bossImage: Buffer | null,
    options: { width: number; height: number },
  ): Promise<Buffer> {
    try {
      const svgBuffer = Buffer.from(svg)
      let image = Sharp(svgBuffer)

      // If there's a boss image, composite it
      if (bossImage) {
        // Position boss image near bottom right
        image = image.composite([
          {
            input: bossImage,
            top: Math.floor(options.height * 0.6), // Match the placeholder in SVG
            left: Math.floor(options.width * 0.65 + 20), // Match the placeholder in SVG
            gravity: 'southeast',
          },
        ])
      }

      // Add rounded corners and slight border
      return await image.png().toBuffer()
    } catch (error) {
      throw new Error(`Final image creation failed: ${error.message}`)
    }
  }
}
