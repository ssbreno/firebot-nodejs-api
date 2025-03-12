import { Injectable } from '@nestjs/common'
import * as sharp from 'sharp'

@Injectable()
export class BannerService {
  async generateBanner(text: string): Promise<Buffer> {
    // Create SVG template with the text
    const svgBuffer = Buffer.from(`
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="white"/>
        <text
          x="600"
          y="315"
          font-family="Arial, sans-serif"
          font-size="48"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="black">
            ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}
        </text>
      </svg>
    `)

    // Convert SVG to PNG
    return await sharp(svgBuffer).png().toBuffer()
  }
}
