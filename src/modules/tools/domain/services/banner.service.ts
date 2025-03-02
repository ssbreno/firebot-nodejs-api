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

      // Decode any base64 encoded text in translations
      const decodedTranslations = {
        ...t,
        avgLevel: this.decodeText(t.avgLevel),
        topVocation: this.decodeText(t.topVocation),
        guildStats: this.decodeText(t.guildStats),
      }

      // Create image directly instead of using SVG
      return await this.createDirectImage(
        assets,
        data,
        decodedTranslations,
        {
          width,
          height,
          theme,
          showLogo,
          showBoss,
          lang: options.lang,
        },
        bossImage,
      )
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
   * Convert text to base64 to handle encoding issues
   */
  private encodeText(text: string): string {
    if (!text) return ''
    return Buffer.from(text).toString('base64')
  }

  /**
   * Decode base64 text
   */
  private decodeText(base64: string): string {
    if (!base64) return ''
    try {
      return Buffer.from(base64, 'base64').toString('utf8')
    } catch (e) {
      throw e
    }
  }

  /**
   * Create image directly using Sharp composite operations
   * This avoids SVG text rendering issues completely
   */
  private async createDirectImage(
    assets: BannerAssets,
    data: BannerData,
    t: Translations[string],
    options: {
      width: number
      height: number
      theme: string
      showLogo: boolean
      showBoss: boolean
      lang?: string
    },
    bossImage: Buffer | null,
  ): Promise<Buffer> {
    try {
      const { width, height, showLogo } = options
      const { worldInfo, guildInfo, boosted } = data
      const { fbotImageBase64 } = assets

      // Calculate online percentage
      const onlinePercentage = Math.round(
        (guildInfo.guild.players_online / guildInfo.guild.members_total) * 100,
      )

      // Define colors to use in the image
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

      // Create base SVG structure WITHOUT any text elements
      // We'll use overlay images for text instead
      const baseSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
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

        <!-- Progress bar for online members with firebot colors -->
        <rect x="${width * 0.02}" y="${height * 0.26}" width="${width * 0.58}" height="${height * 0.06}" rx="3" ry="3" fill="${colors.progressBarBg}" />
        <rect x="${width * 0.02}" y="${height * 0.26}" width="${width * 0.58 * (onlinePercentage / 100)}" height="${height * 0.06}" rx="3" ry="3" fill="${colors.progressBarFill}" />
      </svg>`

      // Create base image from SVG structure
      let baseImage = Sharp(Buffer.from(baseSvg))

      // Array to store all composite operations
      const composites = []

      // Add the logo if enabled
      if (showLogo && fbotImageBase64) {
        const logoBuffer = Buffer.from(fbotImageBase64, 'base64')
        composites.push({
          input: logoBuffer,
          top: Math.floor(height * 0.25),
          left: Math.floor(width * 0.78),
        })
      }

      // Add boss image if available
      if (bossImage) {
        composites.push({
          input: bossImage,
          top: Math.floor(height * 0.6),
          left: Math.floor(width * 0.65) + 20,
        })
      }

      // Create text overlays using Sharp's text feature
      // For each text element needed in the banner:
      // 1. Create text as separate SVG
      // 2. Convert to buffer
      // 3. Add to composites array

      // World name text overlay
      const worldNameText = `${worldInfo.world.name} (${worldInfo.world.pvp_type})`
      const worldNameSvg = this.createTextSvg(
        worldNameText,
        Math.floor(width * 0.01),
        Math.floor(height * 0.08),
        {
          size: Math.floor(height * 0.05),
          color: colors.primaryText,
          bold: true,
        },
      )
      composites.push({
        input: Buffer.from(worldNameSvg),
        top: 0,
        left: 0,
      })

      // Guild name text overlay
      const guildNameSvg = this.createTextSvg(
        guildInfo.guild.name,
        Math.floor(width * 0.65) + 20,
        Math.floor(height * 0.08),
        {
          size: Math.floor(height * 0.04),
          color: colors.primaryText,
        },
      )
      composites.push({
        input: Buffer.from(guildNameSvg),
        top: 0,
        left: 0,
      })

      // Members online text
      const membersOnlineSvg = this.createTextSvg(
        `${t.membersOnline}:`,
        Math.floor(width * 0.02),
        Math.floor(height * 0.23),
        {
          size: Math.floor(height * 0.05),
          color: colors.primaryText,
          bold: true,
        },
      )
      composites.push({
        input: Buffer.from(membersOnlineSvg),
        top: 0,
        left: 0,
      })

      // Progress bar text
      const progressText = `${guildInfo.guild.players_online}/${guildInfo.guild.members_total} (${onlinePercentage}%)`
      const progressTextSvg = this.createTextSvg(
        progressText,
        Math.floor(width * 0.31),
        Math.floor(height * 0.3),
        {
          size: Math.floor(height * 0.04),
          color: colors.primaryText,
          bold: true,
          align: 'center',
        },
      )
      composites.push({
        input: Buffer.from(progressTextSvg),
        top: 0,
        left: 0,
      })

      // Founded date if available
      if (guildInfo.guild.founded) {
        const foundedTextSvg = this.createTextSvg(
          `${t.founded || 'Fundado em'}: ${guildInfo.guild.founded}`,
          Math.floor(width * 0.02),
          Math.floor(height * 0.38),
          {
            size: Math.floor(height * 0.035),
            color: colors.secondaryText,
          },
        )
        composites.push({
          input: Buffer.from(foundedTextSvg),
          top: 0,
          left: 0,
        })
      }

      // Guild description if available
      if (guildInfo.guild.description) {
        const description =
          guildInfo.guild.description.substring(0, 100) +
          (guildInfo.guild.description.length > 100 ? '...' : '')

        const descriptionTextSvg = this.createTextSvg(
          `"${description}"`,
          Math.floor(width * 0.02),
          Math.floor(height * 0.46),
          {
            size: Math.floor(height * 0.03),
            color: colors.accentText,
          },
        )
        composites.push({
          input: Buffer.from(descriptionTextSvg),
          top: 0,
          left: 0,
        })
      }

      // World stats
      const playersOnlineTextSvg = this.createTextSvg(
        `${t.playersOnline}: ${worldInfo.world.players_online}`,
        Math.floor(width * 0.02),
        Math.floor(height * 0.56),
        {
          size: Math.floor(height * 0.035),
          color: colors.successText,
        },
      )
      composites.push({
        input: Buffer.from(playersOnlineTextSvg),
        top: 0,
        left: 0,
      })

      const recordTextSvg = this.createTextSvg(
        `${t.record}: ${worldInfo.world.record_players}`,
        Math.floor(width * 0.02),
        Math.floor(height * 0.64),
        {
          size: Math.floor(height * 0.035),
          color: colors.warningText,
        },
      )
      composites.push({
        input: Buffer.from(recordTextSvg),
        top: 0,
        left: 0,
      })

      const locationTextSvg = this.createTextSvg(
        worldInfo.world.location,
        Math.floor(width * 0.02),
        Math.floor(height * 0.72),
        {
          size: Math.floor(height * 0.035),
          color: colors.dangerText,
        },
      )
      composites.push({
        input: Buffer.from(locationTextSvg),
        top: 0,
        left: 0,
      })

      // Footer
      const footerTextSvg = this.createTextSvg(
        'https://firebot.run',
        Math.floor(width * 0.31),
        Math.floor(height * 0.9),
        {
          size: Math.floor(height * 0.035),
          color: colors.accentText,
          align: 'center',
        },
      )
      composites.push({
        input: Buffer.from(footerTextSvg),
        top: 0,
        left: 0,
      })

      // Boosted boss info
      const bossLabelSvg = this.createTextSvg(
        `${t.boostedBoss}:`,
        Math.floor(width * 0.65) + 20,
        Math.floor(height * 0.5),
        {
          size: Math.floor(height * 0.04),
          color: colors.primaryText,
          bold: true,
        },
      )
      composites.push({
        input: Buffer.from(bossLabelSvg),
        top: 0,
        left: 0,
      })

      const bossNameSvg = this.createTextSvg(
        boosted?.boostable_bosses?.boosted?.name || 'N/A',
        Math.floor(width * 0.65) + 20,
        Math.floor(height * 0.56),
        {
          size: Math.floor(height * 0.035),
          color: colors.accentText,
        },
      )
      composites.push({
        input: Buffer.from(bossNameSvg),
        top: 0,
        left: 0,
      })

      // Apply all composites to the base image
      baseImage = baseImage.composite(composites)

      // Output as PNG
      return await baseImage.png().toBuffer()
    } catch (error) {
      console.error('Direct image creation failed:', error)
      throw new Error(`Direct image creation failed: ${error.message}`)
    }
  }

  /**
   * Helper method to create SVG with text
   * This avoids the font rendering issues by creating text as separate SVG elements
   */
  private createTextSvg(
    text: string,
    x: number,
    y: number,
    options: {
      size: number
      color: string
      bold?: boolean
      align?: 'left' | 'center' | 'right'
    },
  ): string {
    const { size, color, bold = false, align = 'left' } = options

    // Clean text to avoid XML issues
    const cleanText = this.escapeXml(text || '')

    // Set text-anchor based on alignment
    let textAnchor = 'start'
    if (align === 'center') textAnchor = 'middle'
    if (align === 'right') textAnchor = 'end'

    // Create SVG with just the text
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="3000" height="3000">
      <text
        x="${x}"
        y="${y}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${size}"
        ${bold ? 'font-weight="bold"' : ''}
        fill="${color}"
        text-anchor="${textAnchor}">
        ${cleanText}
      </text>
    </svg>`
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
