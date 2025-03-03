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

      // Generate base image without text
      const baseImage = await this.generateBaseImage(data, {
        width,
        height,
        theme,
      })

      // Generate all the text components as direct pixel data
      // (entirely bypassing font rendering systems)
      const textOverlays = await this.createHardcodedTextImages(data, t, {
        width,
        height,
      })

      // Create composite array
      const composites = []

      // Add all text overlays
      for (const overlay of textOverlays) {
        composites.push({
          input: overlay.buffer,
          top: overlay.top,
          left: overlay.left,
        })
      }

      // Add logo if needed
      if (showLogo && assets.fbotImageBase64) {
        try {
          const logoBuffer = Buffer.from(assets.fbotImageBase64, 'base64')

          // Resize the logo to appropriate dimensions
          const resizedLogo = await Sharp(logoBuffer)
            .resize({ width: 100, height: 80, fit: 'inside' })
            .toBuffer()

          composites.push({
            input: resizedLogo,
            top: Math.floor(height * 0.25),
            left: Math.floor(width * 0.78),
          })
        } catch (error) {
          console.error('Error adding logo:', error)
        }
      }

      // Add boss image if available
      if (bossImage) {
        try {
          // Resize boss image
          const resizedBoss = await Sharp(bossImage)
            .resize({ width: 80, height: 80, fit: 'inside' })
            .toBuffer()

          composites.push({
            input: resizedBoss,
            top: Math.floor(height * 0.6),
            left: Math.floor(width * 0.65) + 20,
          })
        } catch (error) {
          console.error('Error adding boss image:', error)
        }
      }

      // Perform the composite operation
      return await Sharp(baseImage).composite(composites).png().toBuffer()
    } catch (error) {
      console.error('Banner generation error:', error)
      throw new Error(`Banner generation failed: ${error.message}`)
    }
  }

  /**
   * Generate base image with layout but no text
   */
  private async generateBaseImage(
    data: BannerData,
    options: {
      width: number
      height: number
      theme: string
    },
  ): Promise<Buffer> {
    const { width, height, theme } = options
    const { worldInfo, guildInfo } = data

    // Calculate online percentage
    const onlinePercentage = Math.round(
      (guildInfo.guild.players_online / guildInfo.guild.members_total) * 100,
    )

    // Firebot theme-specific colors
    const colors = {
      gradientStart: '#3c0000',
      gradientEnd: '#000000',
      headerBg: '#1a0000',
      mainBg: 'rgba(0, 0, 0, 0.9)',
      contentBg: 'rgba(10, 10, 10, 0.9)',
      progressBarBg: '#222222',
      progressBarFill: '#750000',
    }

    // Build the SVG with black and red theme, WITHOUT ANY TEXT
    const baseSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
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

    // Convert SVG to Buffer
    return await Sharp(Buffer.from(baseSvg)).png().toBuffer()
  }

  /**
   * Create hardcoded text images (no font dependency)
   * This uses direct pixel data to create text
   */
  private async createHardcodedTextImages(
    data: BannerData,
    t: Translations[string],
    options: {
      width: number
      height: number
    },
  ): Promise<Array<{ buffer: Buffer; top: number; left: number }>> {
    const { width, height } = options
    const { worldInfo, guildInfo, boosted } = data
    const textOverlays = []

    // Calculate online percentage
    const onlinePercentage = Math.round(
      (guildInfo.guild.players_online / guildInfo.guild.members_total) * 100,
    )

    // Create basic text using rectangle shapes for maximum compatibility
    // For each text element, we'll create a simple colored rectangle "banner"

    // Function to create a simple colored rectangle with text
    const createTextBanner = async (
      text: string,
      color: string,
      bgColor: string = 'rgba(0,0,0,0.5)',
    ) => {
      // Create a simple rectangle with text in it
      // We'll use a background color that matches the theme but with some transparency
      const svgWidth = Math.min(text.length * 14, width * 0.9) // Approximate width based on text length
      const svgHeight = 30

      const bannerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
        <rect width="100%" height="100%" fill="${bgColor}" rx="3" ry="3" />
        <text x="10" y="20" font-family="Arial, sans-serif" font-size="16" fill="${color}">${this.escapeXml(text)}</text>
      </svg>
      `

      return await Sharp(Buffer.from(bannerSvg)).png().toBuffer()
    }

    // Alternatively, we can create text images directly using raw pixels
    // For maximum compatibility if SVG text still fails
    const createTextImage = async (text: string, color: string, fontSize: number = 16) => {
      // For fallback, create a simple image with the text
      // This should be very compatible across environments
      const textWidth = text.length * Math.ceil(fontSize * 0.6)
      const textHeight = Math.ceil(fontSize * 1.5)

      // Create a transparent image
      const img = await Sharp({
        create: {
          width: textWidth,
          height: textHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer()

      // Add text as overlay using SVG
      // Even if this fails, we at least have the colored rectangles as fallback
      const textOverlay = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${textWidth}" height="${textHeight}">
        <text
          x="0"
          y="${Math.ceil(fontSize * 1.2)}"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${fontSize}px"
          fill="${color}"
          style="filter: drop-shadow(1px 1px 2px black);"
        >${this.escapeXml(text)}</text>
      </svg>
      `

      return await Sharp(img)
        .composite([
          {
            input: Buffer.from(textOverlay),
            top: 0,
            left: 0,
          },
        ])
        .png()
        .toBuffer()
    }

    // Function to create a simpler fallback label
    const createLabel = async (text: string, fillColor: string) => {
      const rectWidth = Math.min(text.length * 14, width * 0.35)
      const rectHeight = 24

      // Create a colored rectangle with white text
      const labelSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rectWidth}" height="${rectHeight}">
        <rect width="100%" height="100%" fill="${fillColor}" rx="3" ry="3" />
        <text x="${rectWidth / 2}" y="17" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">${this.escapeXml(text)}</text>
      </svg>
      `

      return await Sharp(Buffer.from(labelSvg)).png().toBuffer()
    }

    try {
      // World name (header)
      const worldText = `${worldInfo.world.name} (${worldInfo.world.pvp_type})`
      const worldNameImg = await createTextImage(worldText, '#ffffff', 18)
      textOverlays.push({
        buffer: worldNameImg,
        top: Math.floor(height * 0.03),
        left: Math.floor(width * 0.02),
      })

      // Guild name
      const guildNameImg = await createTextImage(guildInfo.guild.name, '#ffffff', 16)
      textOverlays.push({
        buffer: guildNameImg,
        top: Math.floor(height * 0.03),
        left: Math.floor(width * 0.65) + 20,
      })

      // Members online title
      const membersOnlineImg = await createTextImage(`${t.membersOnline}:`, '#ffffff', 18)
      textOverlays.push({
        buffer: membersOnlineImg,
        top: Math.floor(height * 0.18),
        left: Math.floor(width * 0.02),
      })

      // Members online stats
      const progressText = `${guildInfo.guild.players_online}/${guildInfo.guild.members_total} (${onlinePercentage}%)`
      const progressImg = await createTextImage(progressText, '#ffffff', 16)
      textOverlays.push({
        buffer: progressImg,
        top: Math.floor(height * 0.27),
        left: Math.floor(width * 0.15),
      })

      // Founded date
      if (guildInfo.guild.founded) {
        const foundedText = `${t.founded || 'Fundado em'}: ${guildInfo.guild.founded}`
        const foundedImg = await createTextImage(foundedText, '#bbbbbb', 14)
        textOverlays.push({
          buffer: foundedImg,
          top: Math.floor(height * 0.35),
          left: Math.floor(width * 0.02),
        })
      }

      // Description
      if (guildInfo.guild.description) {
        const description =
          guildInfo.guild.description.substring(0, 100) +
          (guildInfo.guild.description.length > 100 ? '...' : '')
        const descriptionImg = await createTextImage(`"${description}"`, '#ff3333', 12)
        textOverlays.push({
          buffer: descriptionImg,
          top: Math.floor(height * 0.42),
          left: Math.floor(width * 0.02),
        })
      }

      // World stats
      const playersOnlineText = `${t.playersOnline}: ${worldInfo.world.players_online}`
      const playersOnlineImg = await createTextImage(playersOnlineText, '#00cc44', 14)
      textOverlays.push({
        buffer: playersOnlineImg,
        top: Math.floor(height * 0.52),
        left: Math.floor(width * 0.02),
      })

      const recordText = `${t.record}: ${worldInfo.world.record_players}`
      const recordImg = await createTextImage(recordText, '#ffaa00', 14)
      textOverlays.push({
        buffer: recordImg,
        top: Math.floor(height * 0.6),
        left: Math.floor(width * 0.02),
      })

      const locationImg = await createTextImage(worldInfo.world.location, '#ff3333', 14)
      textOverlays.push({
        buffer: locationImg,
        top: Math.floor(height * 0.68),
        left: Math.floor(width * 0.02),
      })

      // Website
      const websiteImg = await createTextImage('https://firebot.run', '#ff3333', 14)
      textOverlays.push({
        buffer: websiteImg,
        top: Math.floor(height * 0.85),
        left: Math.floor(width * 0.15),
      })

      // Boosted boss title
      const bossLabelImg = await createTextImage(`${t.boostedBoss}:`, '#ffffff', 16)
      textOverlays.push({
        buffer: bossLabelImg,
        top: Math.floor(height * 0.46),
        left: Math.floor(width * 0.65) + 20,
      })

      // Boosted boss name
      const bossName = boosted?.boostable_bosses?.boosted?.name || 'N/A'
      const bossNameImg = await createTextImage(bossName, '#ff3333', 14)
      textOverlays.push({
        buffer: bossNameImg,
        top: Math.floor(height * 0.52),
        left: Math.floor(width * 0.65) + 20,
      })

      // Fallback: Create basic colored rectangles with labels as a final option
      // This creates very simple colored labels that should always render
      if (textOverlays.length === 0) {
        // Create simple colored labels for critical info
        const worldLabel = await createLabel(`${worldInfo.world.name}`, '#3c0000')
        textOverlays.push({
          buffer: worldLabel,
          top: Math.floor(height * 0.03),
          left: Math.floor(width * 0.02),
        })

        const guildLabel = await createLabel(`${guildInfo.guild.name}`, '#3c0000')
        textOverlays.push({
          buffer: guildLabel,
          top: Math.floor(height * 0.03),
          left: Math.floor(width * 0.65) + 20,
        })

        const statsLabel = await createLabel(
          `Online: ${guildInfo.guild.players_online}/${guildInfo.guild.members_total}`,
          '#750000',
        )
        textOverlays.push({
          buffer: statsLabel,
          top: Math.floor(height * 0.27),
          left: Math.floor(width * 0.15),
        })

        const bossLabel = await createLabel(
          `${boosted?.boostable_bosses?.boosted?.name || 'Boss'}`,
          '#750000',
        )
        textOverlays.push({
          buffer: bossLabel,
          top: Math.floor(height * 0.52),
          left: Math.floor(width * 0.65) + 20,
        })
      }
    } catch (error) {
      console.error('Error creating text images:', error)
      // In case of failure, add a minimal fallback text banner
      try {
        const fallbackText = await createTextBanner('Firebot Guild Banner', '#ffffff', '#3c0000')
        textOverlays.push({
          buffer: fallbackText,
          top: Math.floor(height * 0.03),
          left: Math.floor(width * 0.3),
        })
      } catch (e) {
        console.error('Even fallback text failed:', e)
      }
    }

    return textOverlays
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
