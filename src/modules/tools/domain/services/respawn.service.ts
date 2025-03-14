import { Injectable, Logger } from '@nestjs/common'
import * as sharp from 'sharp'
import { FirebotIntegration } from '../../infrastructure/integrations/firebot.integration'

interface Respawn {
  id: string
  name: string
  city: string
}

interface CityGroup {
  city: string
  respawns: Respawn[]
}

@Injectable()
export class RespawnService {
  private readonly logger = new Logger(RespawnService.name)

  constructor(private readonly firebotIntegration: FirebotIntegration) {}

  /**
   * Generate a respawn list image with proper city grouping and compact layout
   */
  async generateRespawnImage(): Promise<Buffer> {
    try {
      // Fetch respawn data
      const response = await this.firebotIntegration.fetchRespawns()

      // Log a sample respawn item to debug the structure
      if (response.respawns.length > 0) {
        this.logger.debug(`Sample respawn: ${JSON.stringify(response.respawns[0])}`)
      }

      // Process and group respawns by city
      const groupedRespawns = this.groupRespawnsByCity(response.respawns)

      // Debug grouped data
      this.logger.debug(`Grouped cities: ${groupedRespawns.map(g => g.city).join(', ')}`)

      // Generate the final image
      return await this.createRespawnListImage(groupedRespawns)
    } catch (error) {
      this.logger.error(`Error generating respawn image: ${error.message}`, error.stack)
      throw error
    }
  }

  /**
   * Group respawns by city using the description field
   */
  private groupRespawnsByCity(respawns: any[]): CityGroup[] {
    if (!respawns || respawns.length === 0) {
      return []
    }

    // Create a map of cities to respawns
    const respawnMap = new Map<string, Respawn[]>()

    respawns.forEach(respawn => {
      // Use description as the city field, or fallback to Unknown
      const city = respawn.description ? this.capitalizeFirstLetter(respawn.description) : 'Unknown'

      if (!respawnMap.has(city)) {
        respawnMap.set(city, [])
      }

      // Use alias if available, otherwise use the first letter + id
      let cleanId = respawn.alias || `${respawn.id.toString().charAt(0) || 'r'}${respawn.id}`

      // Handle UUIDs by extracting just the alphanumeric prefix
      if (typeof cleanId === 'string' && cleanId.includes('-')) {
        const match = cleanId.match(/^([a-z]\d+)/)
        if (match) {
          cleanId = match[1]
        }
      }

      // Add to city group
      respawnMap.get(city)!.push({
        id: cleanId,
        name: respawn.name,
        city: city,
      })
    })

    // Convert map to array and sort alphabetically
    const groupedRespawns: CityGroup[] = Array.from(respawnMap.entries())
      .map(([city, respawns]) => ({
        city,
        respawns: respawns.sort((a, b) => {
          // Extract numbers from IDs for numeric sorting
          const numA = parseInt(a.id.replace(/\D/g, '')) || 0
          const numB = parseInt(b.id.replace(/\D/g, '')) || 0
          return numA - numB
        }),
      }))
      .sort((a, b) => a.city.localeCompare(b.city))

    return groupedRespawns
  }

  /**
   * Capitalize first letter of a string
   */
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  /**
   * Create the final respawn list image with compact side-by-side layout
   */
  private async createRespawnListImage(cityGroups: CityGroup[]): Promise<Buffer> {
    try {
      // Set image dimensions for compact layout
      const itemHeight = 30 // Smaller height for each item
      const cityHeaderHeight = 40 // Height for city headers
      const titleHeight = 60 // Height for title
      const padding = 10 // Smaller padding
      const columnWidth = 450 // Width for each column
      const columns = 3 // Number of columns
      const columnGap = 10 // Gap between columns

      // Calculate total width
      const imageWidth = columnWidth * columns + columnGap * (columns - 1) + padding * 2

      // Distribute cities across columns as evenly as possible
      const columnCities: CityGroup[][] = Array(columns)
        .fill(0)
        .map(() => [])

      // Distribute by trying to balance the number of items in each column
      const columnItemCounts = Array(columns).fill(0)

      // Sort by respawn count to distribute more evenly
      const sortedGroups = [...cityGroups].sort((a, b) => b.respawns.length - a.respawns.length)

      sortedGroups.forEach(cityGroup => {
        // Find the column with the fewest items
        const minItemsColIndex = columnItemCounts.indexOf(Math.min(...columnItemCounts))
        columnCities[minItemsColIndex].push(cityGroup)
        columnItemCounts[minItemsColIndex] += cityGroup.respawns.length + 1 // +1 for header
      })

      // Calculate height needed for each column
      const columnHeights = columnCities.map(cities => {
        let height = 0
        cities.forEach(city => {
          height += cityHeaderHeight
          height += city.respawns.length * itemHeight
          height += padding // Space after each city
        })
        return height
      })

      // Use the tallest column height + title + padding
      const tallestColumn = Math.max(...columnHeights)
      const totalHeight = tallestColumn + titleHeight + padding * 2

      // Create white background
      const background = await sharp({
        create: {
          width: imageWidth,
          height: totalHeight,
          channels: 4 as const,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer()

      // Start with this background
      const canvas = sharp(background)
      const composites = []

      // Add title
      const titleSvg = `
        <svg width="${imageWidth}" height="${titleHeight}" xmlns="http://www.w3.org/2000/svg">
          <text x="${imageWidth / 2}" y="${titleHeight / 2 + 5}"
            text-anchor="middle" dominant-baseline="middle"
            font-family="Arial, sans-serif" font-weight="bold" font-size="36"
            fill="#e67e22" style="text-transform: uppercase; letter-spacing: 1px;">
            RESPAWN LIST
          </text>
        </svg>
      `

      composites.push({
        input: Buffer.from(titleSvg),
        top: padding,
        left: 0,
      })

      // Process each column
      for (let colIndex = 0; colIndex < columns; colIndex++) {
        const colCities = columnCities[colIndex]
        const colX = padding + colIndex * (columnWidth + columnGap)
        let yPos = titleHeight + padding

        // Process each city in this column
        for (const cityGroup of colCities) {
          // Create city header
          const headerSvg = `
            <svg width="${columnWidth}" height="${cityHeaderHeight}" xmlns="http://www.w3.org/2000/svg">
              <rect width="${columnWidth}" height="${cityHeaderHeight}" rx="4" ry="4" fill="#e67e22" />
              <text x="10" y="${cityHeaderHeight / 2 + 5}"
                font-family="Arial, sans-serif" font-weight="bold" font-size="18"
                fill="white">
                ${this.escapeXml(cityGroup.city.toUpperCase())}
              </text>
            </svg>
          `

          composites.push({
            input: Buffer.from(headerSvg),
            top: yPos,
            left: colX,
          })

          yPos += cityHeaderHeight

          // Add respawn items for this city
          for (let i = 0; i < cityGroup.respawns.length; i++) {
            const respawn = cityGroup.respawns[i]
            const isEven = i % 2 === 0
            const bgColor = isEven ? '#f5f5f5' : '#ffffff'

            const itemSvg = `
              <svg width="${columnWidth}" height="${itemHeight}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${columnWidth}" height="${itemHeight}" fill="${bgColor}" />
                <text x="10" y="${itemHeight / 2 + 5}"
                  font-family="Arial, sans-serif" font-weight="bold" font-size="14"
                  fill="#e74c3c">
                  ${this.escapeXml(respawn.id)}
                </text>
                <text x="60" y="${itemHeight / 2 + 5}"
                  font-family="Arial, sans-serif" font-size="14"
                  fill="#333333">
                  ${this.escapeXml(respawn.name)}
                </text>
              </svg>
            `

            composites.push({
              input: Buffer.from(itemSvg),
              top: yPos,
              left: colX,
            })

            yPos += itemHeight
          }

          // Add padding after each city
          yPos += padding
        }
      }

      // If no respawns, show a message
      if (cityGroups.length === 0) {
        const noRespawnsSvg = `
          <svg width="${imageWidth}" height="80" xmlns="http://www.w3.org/2000/svg">
            <text x="${imageWidth / 2}" y="40"
              text-anchor="middle" dominant-baseline="middle"
              font-family="Arial, sans-serif" font-size="20"
              fill="#333333">
              No respawns available
            </text>
          </svg>
        `

        composites.push({
          input: Buffer.from(noRespawnsSvg),
          top: titleHeight + padding,
          left: 0,
        })
      }

      // Generate the final image
      return await canvas.composite(composites).png().toBuffer()
    } catch (error) {
      this.logger.error(`Error creating respawn list image: ${error.message}`, error.stack)
      throw error
    }
  }

  /**
   * Escape XML special characters for SVG text
   */
  private escapeXml(unsafe: string): string {
    if (!unsafe) return ''
    return String(unsafe).replace(/[<>&'"]/g, c => {
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
