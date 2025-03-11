import { Injectable } from '@nestjs/common'
import { exec } from 'child_process'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'

interface BannerOptions {
  width?: number
  height?: number
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  fontName?: string
  padding?: number
}

@Injectable()
export class BannerService {
  async generateBanner(text: string, options: BannerOptions = {}): Promise<Buffer> {
    const {
      width = 1200,
      height = 630,
      backgroundColor = 'white',
      textColor = 'black',
      fontSize = 48,
      fontName = 'Arial',
      padding = 50,
    } = options

    // Create a temporary file name
    const tempDir = os.tmpdir()
    const randomName = crypto.randomBytes(16).toString('hex')
    const outputPath = path.join(tempDir, `${randomName}.png`)

    try {
      // Escape special characters in text for shell command
      const escapedText = text.replace(/["\\$`]/g, '\\$&')

      // Use ImageMagick to create the image
      await this.executeCommand(
        `convert -size ${width}x${height} xc:${backgroundColor} ` +
          `-fill ${textColor} -font ${fontName} -pointsize ${fontSize} ` +
          `-gravity center -annotate +0+0 "${escapedText}" ` +
          `"${outputPath}"`,
      )

      // Read the file
      const buffer = await fs.readFile(outputPath)

      // Delete the temporary file
      await fs.unlink(outputPath)

      return buffer
    } catch (error) {
      // Clean up on error
      try {
        await fs.access(outputPath)
        await fs.unlink(outputPath)
      } catch {
        // Ignore if file doesn't exist
      }
      throw new Error(`Failed to generate banner: ${error.message}`)
    }
  }

  async generateFancyBanner(
    text: string,
    options: BannerOptions & { gradient?: boolean } = {},
  ): Promise<Buffer> {
    const {
      width = 1200,
      height = 630,
      backgroundColor = 'white',
      textColor = 'black',
      fontSize = 48,
      fontName = 'Arial',
      padding = 50,
      gradient = false,
    } = options

    // Create temporary files
    const tempDir = os.tmpdir()
    const randomName = crypto.randomBytes(16).toString('hex')
    const outputPath = path.join(tempDir, `${randomName}.png`)

    try {
      // Escape special characters in text for shell command
      const escapedText = text.replace(/["\\$`]/g, '\\$&')

      let command
      if (gradient) {
        // Create gradient background
        command =
          `convert -size ${width}x${height} gradient:blue-purple ` +
          `-fill white -font ${fontName} -pointsize ${fontSize} ` +
          `-gravity center -annotate +0+0 "${escapedText}" ` +
          `"${outputPath}"`
      } else {
        // Simple solid background
        command =
          `convert -size ${width}x${height} xc:${backgroundColor} ` +
          `-fill ${textColor} -font ${fontName} -pointsize ${fontSize} ` +
          `-gravity center -annotate +0+0 "${escapedText}" ` +
          `"${outputPath}"`
      }

      await this.executeCommand(command)

      // Read the file
      const buffer = await fs.readFile(outputPath)

      // Delete the temporary file
      await fs.unlink(outputPath)

      return buffer
    } catch (error) {
      // Clean up on error
      try {
        await fs.access(outputPath)
        await fs.unlink(outputPath)
      } catch {
        // Ignore if file doesn't exist
      }
      throw new Error(`Failed to generate banner: ${error.message}`)
    }
  }

  private executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\n${stderr}`))
        } else {
          resolve()
        }
      })
    })
  }
}
