import { Injectable, Logger } from '@nestjs/common'
import { join } from 'path'
import * as Sharp from 'sharp'
import * as fs from 'fs/promises'
import { translations } from '../../config/constants'
import {
  BannerAssets,
  BannerData,
  BannerOptions,
  Translations,
} from '../interfaces/banner.interface'
import { ApiService } from '../../infrastructure/integrations/tibiadata.integration'
import { FirebotIntegration } from '../../infrastructure/integrations/firebot.integration'

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name)

  constructor(
    private readonly apiService: ApiService,
    private readonly firebotIntegration: FirebotIntegration,
  ) {}

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
        width = 1200,
        height = 300,
      } = options

      const t = translations[lang] || translations.pt
      const assets = await this.loadAssets(theme)
      const data = await this.fetchData(world, guildName)

      // Only fetch boss image if enabled in options
      const bossImage = showBoss ? await this.getBossImage(data.boosted) : null

      // Fetch Rashid image
      const rashidImage = await this.getRashidImage()
      if (!rashidImage) {
        this.logger.warn('Rashid image could not be loaded')
      }

      // Decode any base64 encoded text in translations
      const decodedTranslations = {
        ...t,
        avgLevel: this.decodeText(t.avgLevel),
        topVocation: this.decodeText(t.topVocation),
        guildStats: this.decodeText(t.guildStats),
      }

      // Use the traditional SVG approach but without text elements
      const rawSvg = this.generateBaseStructureSVG(data, {
        width,
        height,
        theme,
        showBoss,
        lang: options.lang,
      })

      // Create the final image with text overlays
      return await this.createFinalImageWithText(
        rawSvg,
        assets,
        data,
        decodedTranslations,
        bossImage,
        rashidImage,
        options,
      )
    } catch (error) {
      this.logger.error(`Banner generation error: ${error.message}`, error.stack)
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
          this.logger.debug(`Failed to load assets from ${basePath}: ${e.message}`)
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

      // Create a wrapper for each API call that catches its specific errors
      const fetchWorldInfoSafe = async () => {
        try {
          return await this.apiService.fetchWorldInfo(world)
        } catch (error) {
          this.logger.error(`Error fetching world info for ${world}: ${error.message}`)
          return {
            world: {
              name: world,
              pvp_type: 'Unknown',
              players_online: 0,
              record_players: 0,
              location: 'Unknown',
            },
          }
        }
      }

      const fetchGuildInfoSafe = async () => {
        try {
          return await this.apiService.fetchGuildInfo(guildName)
        } catch (error) {
          this.logger.error(`Error fetching guild info for ${guildName}: ${error.message}`)
          throw new Error(
            `Guild "${guildName}" not found. Please check the guild name and try again.`,
          )
        }
      }

      const fetchBoostedBossesSafe = async () => {
        try {
          return await this.apiService.fetchBoostedBosses()
        } catch (error) {
          this.logger.error(`Error fetching boosted bosses: ${error.message}`)
          return { boostable_bosses: { boosted: { name: 'Unknown' } } }
        }
      }

      const fetchRashidLocationSafe = async () => {
        try {
          const location = await this.firebotIntegration.fetchRashidLocation()
          this.logger.debug(`Rashid location fetched: ${JSON.stringify(location)}`)
          return location
        } catch (error) {
          this.logger.error(`Error fetching Rashid location: ${error.message}`)
          return { city: 'Unknown', place: 'Unknown' }
        }
      }

      const fetchWorldChangesSafe = async () => {
        try {
          return await this.firebotIntegration.fetchWorldChanges(world)
        } catch (error) {
          this.logger.error(`Error fetching world changes for ${world}: ${error.message}`)
          return { changes: [] }
        }
      }

      // Execute all API calls in parallel with improved error handling
      const [worldInfo, guildInfo, boosted, rashidLocation, worldChanges] = await Promise.all([
        fetchWorldInfoSafe(),
        fetchGuildInfoSafe(),
        fetchBoostedBossesSafe(),
        fetchRashidLocationSafe(),
        fetchWorldChangesSafe(),
      ])

      // Guild info is required - we'll throw an error if it's missing
      if (!guildInfo?.guild) {
        throw new Error(
          `Guild "${guildName}" not found. Please check the guild name and try again.`,
        )
      }

      // Add the current date and time for "last updated"
      const updateDate = new Date().toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })

      // Comprehensive check for Yasir
      const yasirIsActive = this.checkForYasir(worldChanges)

      this.logger.debug(
        `Data fetched successfully: world=${world}, guild=${guildName}, yasir=${yasirIsActive}, rashid=${rashidLocation?.city}`,
      )

      return {
        worldInfo,
        guildInfo,
        boosted,
        rashidLocation,
        worldChanges,
        yasirIsActive,
        updateDate,
      }
    } catch (error) {
      this.logger.error(`Data fetching error details: ${error.message}`, error.stack)
      throw new Error(`Data fetching failed: ${error.message}`)
    }
  }

  /**
   * Comprehensive check for Yasir in world changes
   */
  private checkForYasir(worldChanges: any): boolean {
    try {
      // Try all possible data structures

      // Check the changes array if it's an array of strings
      if (Array.isArray(worldChanges?.changes)) {
        if (
          worldChanges.changes.some(
            (change: string | string[]) =>
              typeof change === 'string' && change.includes('Oriental Trader'),
          )
        ) {
          return true
        }

        // Check if it's an array of objects
        if (
          worldChanges.changes.some(
            (change: {
              type: string | string[]
              name: string | string[]
              description: string | string[]
            }) =>
              typeof change === 'object' &&
              ((change.type && change.type.includes('Oriental Trader')) ||
                (change.name && change.name.includes('Oriental Trader')) ||
                (change.description && change.description.includes('Oriental Trader'))),
          )
        ) {
          return true
        }
      }

      // Check world_changes structure
      if (Array.isArray(worldChanges?.world_changes)) {
        if (
          worldChanges.world_changes.some(
            (change: {
              name: string | string[]
              link: string | string[]
              description: string | string[]
            }) =>
              typeof change === 'object' &&
              ((change.name && change.name.includes('Oriental Trader')) ||
                (change.link && change.link.includes('Oriental Trader')) ||
                (change.description && change.description.includes('Oriental Trader'))),
          )
        ) {
          return true
        }
      }

      // If all checks failed, Yasir is not present
      return false
    } catch (error) {
      this.logger.warn(`Error checking for Yasir: ${error.message}`)
      return false
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
      this.logger.warn(`Boss image processing failed: ${error.message}`)
      return null
    }
  }

  /**
   * Get the Rashid image from assets - completely reworked for better reliability
   */
  private async getRashidImage(): Promise<Buffer | null> {
    try {
      const possiblePaths = [
        join(process.cwd(), 'src/assets/images'),
        join(process.cwd(), 'dist/src/assets/images'),
        '/app/src/assets/images',
        '/app/dist/src/assets/images',
      ]

      // Try to load a static PNG version first (more reliable than GIF)
      for (const ext of ['png', 'jpg', 'gif']) {
        const rashidFilename = `rashid.${ext}`

        for (const basePath of possiblePaths) {
          const rashidPath = join(basePath, rashidFilename)
          try {
            // Check if file exists
            await fs.access(rashidPath)
            this.logger.debug(`Found Rashid image at: ${rashidPath}`)

            // Read the file directly
            const fileBuffer = await fs.readFile(rashidPath)

            // If it's a GIF, use special handling
            if (ext === 'gif') {
              return await this.processGifImage(fileBuffer)
            }

            // For PNG/JPG, just return as is
            return fileBuffer
          } catch (e) {
            this.logger.debug(`Failed to load Rashid image from ${rashidPath}: ${e.message}`)
            continue
          }
        }
      }

      // If all direct file access failed, try to create a fallback generic image
      return await this.createFallbackRashidImage()
    } catch (error) {
      this.logger.warn(`Rashid image processing failed: ${error.message}`)
      return this.createFallbackRashidImage()
    }
  }

  /**
   * Process GIF image properly - specialized handling
   */
  private async processGifImage(buffer: Buffer): Promise<Buffer> {
    try {
      // For GIFs, extract first frame only
      return await Sharp(buffer, {
        animated: false, // Don't try to handle animation
        limitInputPixels: false, // Don't limit input size
        pages: 1, // Extract just first page
      })
        .png() // Convert to PNG for reliability
        .toBuffer()
    } catch (error) {
      this.logger.warn(`GIF processing failed: ${error.message}`)
      return this.createFallbackRashidImage()
    }
  }

  /**
   * Create a fallback image for Rashid when the actual image can't be loaded
   */
  private async createFallbackRashidImage(): Promise<Buffer> {
    // Create a simple SVG for Rashid
    const svgBuffer = Buffer.from(`
    <svg width="70" height="70" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="35" r="32" fill="#4a235a" stroke="#9b59b6" stroke-width="2"/>
      <text x="35" y="32" font-family="Arial" font-size="12" text-anchor="middle" fill="white">Rashid</text>
      <text x="35" y="48" font-family="Arial" font-size="10" text-anchor="middle" fill="#bb8fce">NPC</text>
    </svg>
  `)

    // Convert SVG to PNG
    return await Sharp(svgBuffer).png().toBuffer()
  }

  /**
   * Generate the base SVG structure WITHOUT any text elements
   */
  private generateBaseStructureSVG(
    data: BannerData,
    options: {
      width?: number
      height?: number
      theme?: string
      showBoss?: boolean
      lang?: string
    },
  ): string {
    try {
      const { worldInfo, guildInfo } = data
      const { width = 1200, height = 300 } = options

      if (!worldInfo || !guildInfo) {
        throw new Error('Missing required data for SVG generation')
      }

      // Firebot theme-specific colors
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

      // Build the SVG with black and red theme, WITHOUT ANY TEXT
      return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
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
    } catch (error) {
      throw new Error(`SVG generation failed: ${error.message}`)
    }
  }

  /**
   * Create final image with text overlays - corrected positioning
   */
  private async createFinalImageWithText(
    svg: string,
    assets: BannerAssets,
    data: BannerData,
    t: Translations[string],
    bossImage: Buffer | null,
    rashidImage: Buffer | null,
    options: {
      width?: number
      height?: number
      theme?: string
      showLogo?: boolean
      showBoss?: boolean
      lang?: string
    },
  ): Promise<Buffer> {
    try {
      const { width = 1200, height = 300, showLogo = true } = options

      const { fbotImageBase64 } = assets
      const { worldInfo, guildInfo, boosted, rashidLocation, yasirIsActive, updateDate } = data

      // Calculate online percentage
      const onlinePercentage = Math.round(
        (guildInfo.guild.players_online / guildInfo.guild.members_total) * 100,
      )

      // Convert base SVG to image
      const svgBuffer = Buffer.from(svg)
      const image = Sharp(svgBuffer)

      // Enhanced color scheme for better readability
      const colors = {
        primaryText: '#ffffff', // Bright white for main text
        secondaryText: '#d0d0d0', // Lighter gray for secondary text
        accentText: '#ff4d4d', // Brighter red for accents
        successText: '#00ff44', // Brighter green for success
        warningText: '#ffcc00', // Brighter yellow for warnings
        dangerText: '#ff4d4d', // Bright red for danger
        rashidGreen: '#55ff55', // Green for Rashid text
        textShadow: 'black', // Text shadow color
        infoBoxBg: 'rgba(0,0,0,0.6)', // Semi-transparent background for text boxes
      }

      // Create all the text images
      const composites = []

      // Add logo - keep in original position (right side, middle)
      if (showLogo && fbotImageBase64) {
        const logoBuffer = Buffer.from(fbotImageBase64, 'base64')

        // Resize and position the logo in the original location
        const resizedLogo = await Sharp(logoBuffer)
          .resize({ width: 130, height: 110, fit: 'inside' })
          .toBuffer()

        composites.push({
          input: resizedLogo,
          top: Math.floor(height * 0.4), // Original middle-right position
          left: Math.floor(width * 0.52), // Right side
        })
      }

      // Add boss image if available
      if (bossImage) {
        const resizedBoss = await Sharp(bossImage)
          .resize({ width: 85, height: 85, fit: 'inside' })
          .toBuffer()

        composites.push({
          input: resizedBoss,
          top: Math.floor(height * 0.35),
          left: Math.floor(width * 0.8),
        })
      }

      // Add Rashid image (the NPC character) - corrected position at bottom right
      if (rashidImage) {
        try {
          const resizedRashid = await Sharp(rashidImage)
            .resize({ width: 100, height: 100, fit: 'contain', background: 'transparent' })
            .toBuffer()

          composites.push({
            input: resizedRashid,
            top: Math.floor(height * 0.25), // Position in the lower right section
            left: Math.floor(width * 0.7), // Aligned with other right elements
          })
        } catch (error) {
          this.logger.error(`Failed to process Rashid image: ${error.message}`)
        }
      }

      // Create background for text areas to improve readability
      const textBgSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background for timestamp (top right) -->
      <rect x="${width * 0.76}" y="${height * 0.04}" width="${width * 0.23}" height="${height * 0.03}"
            rx="3" ry="3" fill="${colors.infoBoxBg}" opacity="0.7"/>

      <!-- Background for Rashid location (bottom right) -->
      <rect x="${width * 0.76}" y="${height * 0.62}" width="${width * 0.21}" height="${height * 0.2}"
            rx="4" ry="4" fill="${colors.infoBoxBg}" opacity="0.5"/>

      <!-- Background for Yasir status (bottom left) -->
      <rect x="${width * 0.11}" y="${height * 0.77}" width="${width * 0.1}" height="${height * 0.06}"
            rx="4" ry="4" fill="${colors.infoBoxBg}" opacity="0.7"/>
    </svg>`

      const textBgOverlay = await Sharp(Buffer.from(textBgSvg))
        .resize(width, height)
        .png()
        .toBuffer()

      composites.push({
        input: textBgOverlay,
        top: 0,
        left: 0,
      })

      // Create a transparent overlay for all text
      const textSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Text shadow filter for better readability -->
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="${colors.textShadow}" flood-opacity="0.8"/>
        </filter>

        <!-- Stronger glow for Rashid text -->
        <filter id="rashidGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#009900" flood-opacity="0.8"/>
        </filter>
      </defs>

      <!-- World name (top left) -->
      <text x="${width * 0.01}" y="${height * 0.08}" font-family="Arial, sans-serif" font-size="${height * 0.055}" font-weight="bold"
            fill="${colors.primaryText}" filter="url(#textShadow)">
        ${this.escapeXml(worldInfo.world.name)} (${this.escapeXml(worldInfo.world.pvp_type)})
      </text>

      <!-- Guild Name (top right) -->
      <text x="${width * 0.75}" y="${height * 0.08}" font-family="Arial, sans-serif" font-size="${height * 0.055}" font-weight="bold"
            fill="${colors.primaryText}" filter="url(#textShadow)">
        ${this.escapeXml(guildInfo.guild.name)}
      </text>

      <!-- Last updated date (top right) -->
      <text x="${width * 0.57}" y="${height * 0.07 - 2}" font-family="Arial, sans-serif" font-size="${height * 0.025}"
            fill="${colors.secondaryText}" filter="url(#textShadow)">
        Atualizado em: ${updateDate}
      </text>

      <!-- Main guild info -->
      <text x="${width * 0.02}" y="${height * 0.23}" font-family="Arial, sans-serif" font-size="${height * 0.055}" font-weight="bold"
            fill="${colors.primaryText}" filter="url(#textShadow)">
        ${this.escapeXml(t.membersOnline)}:
      </text>

      <!-- Progress bar text -->
      <text x="${width * 0.31}" y="${height * 0.3}" font-family="Arial, sans-serif" font-size="${height * 0.045}" text-anchor="middle"
            fill="${colors.primaryText}" font-weight="bold" filter="url(#textShadow)">
        ${guildInfo.guild.players_online}/${guildInfo.guild.members_total} (${onlinePercentage}%)
      </text>

      <!-- Guild foundation date if available -->
      ${
        guildInfo.guild.founded
          ? `
      <text x="${width * 0.02}" y="${height * 0.38}" font-family="Arial, sans-serif" font-size="${height * 0.038}"
            fill="${colors.secondaryText}" filter="url(#textShadow)">
        ${t.founded || 'Fundado em'}: ${guildInfo.guild.founded}
      </text>
      `
          : ''
      }

      <!-- Guild description if available -->
      ${
        guildInfo.guild.description
          ? `
      <text x="${width * 0.02}" y="${height * 0.46}" font-family="Arial, sans-serif" font-size="${height * 0.035}"
            fill="${colors.accentText}" filter="url(#textShadow)">
        "${guildInfo.guild.description.substring(0, 100)}${guildInfo.guild.description.length > 100 ? '...' : ''}"
      </text>
      `
          : ''
      }

      <!-- World stats section -->
      <text x="${width * 0.02}" y="${height * 0.56}" font-family="Arial, sans-serif" font-size="${height * 0.038}"
            fill="${colors.successText}" filter="url(#textShadow)">
        ${t.playersOnline}: ${worldInfo.world.players_online}
      </text>

      <text x="${width * 0.02}" y="${height * 0.65}" font-family="Arial, sans-serif" font-size="${height * 0.038}"
            fill="${colors.warningText}" filter="url(#textShadow)">
        ${t.record}: ${worldInfo.world.record_players}
      </text>

      <text x="${width * 0.02}" y="${height * 0.74}" font-family="Arial, sans-serif" font-size="${height * 0.038}"
            fill="${colors.dangerText}" filter="url(#textShadow)">
        ${worldInfo.world.location}
      </text>

      <!-- Boss info -->
      <text x="${width * 0.88}" y="${height * 0.4}" font-family="Arial, sans-serif" font-size="${height * 0.045}"
            font-weight="bold" fill="${colors.primaryText}" filter="url(#textShadow)">
        ${this.escapeXml(t.boostedBoss)}:
      </text>

      <text x="${width * 0.88}" y="${height * 0.46}" font-family="Arial, sans-serif" font-size="${height * 0.04}"
            fill="${colors.accentText}" filter="url(#textShadow)">
        ${this.escapeXml(boosted?.boostable_bosses?.boosted?.name || 'N/A')}
      </text>

      <!-- Rashid label, style as in your screenshot -->
      <text x="${width * 0.7}" y="${height * 0.6}" font-family="Arial, sans-serif" font-size="${height * 0.042}"
            fill="${colors.primaryText}" font-weight="bold" filter="url(#textShadow)">
        Rashid:
      </text>

      <!-- Stylized "Rashid" text as shown in screenshot -->
      <text x="${width * 0.7}" y="${height * 0.7}" font-family="Arial, sans-serif" font-size="${height * 0.045}"
            fill="${colors.rashidGreen}" filter="url(#rashidGlow)" text-anchor="middle" font-weight="bold">
        Rashid
      </text>

      <!-- Rashid location city in green -->
      <text x="${width * 0.7}" y="${height * 0.76}" font-family="Arial, sans-serif" font-size="${height * 0.04}"
            fill="${colors.rashidGreen}" filter="url(#rashidGlow)" text-anchor="middle">
        ${this.escapeXml(rashidLocation?.city || '')}
      </text>

      <!-- Yasir info -->
      <text x="${width * 0.02}" y="${height * 0.83}" font-family="Arial, sans-serif" font-size="${height * 0.042}"
            font-weight="bold" fill="${colors.primaryText}" filter="url(#textShadow)">
        Yasir:
      </text>

      <!-- Yasir status with enhanced visibility -->
      <text x="${width * 0.07}" y="${height * 0.83}" font-family="Arial, sans-serif" font-size="${height * 0.045}"
            font-weight="bold" fill="${yasirIsActive ? colors.successText : colors.dangerText}" filter="url(#textShadow)">
        ${yasirIsActive ? 'ON' : 'OFF'}
      </text>

      <!-- Footer -->
      <text x="${width * 0.05}" y="${height * 0.92}" font-family="Arial, sans-serif" font-size="${height * 0.038}"
            text-anchor="middle" fill="${colors.accentText}" filter="url(#textShadow)">
        https://firebot.run
      </text>
    </svg>`

      // Convert text SVG to PNG with transparency
      const textOverlay = await Sharp(Buffer.from(textSvg)).resize(width, height).png().toBuffer()

      // Add text overlay as the final layer
      composites.push({
        input: textOverlay,
        top: 0,
        left: 0,
      })

      // Apply all composites and return the final image
      return await image.composite(composites).png().toBuffer()
    } catch (error) {
      this.logger.error(`Final image creation error: ${error.message}`, error.stack)
      throw new Error(`Final image creation failed: ${error.message}`)
    }
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
