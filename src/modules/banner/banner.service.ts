import { Injectable } from '@nestjs/common'
import * as puppeteer from 'puppeteer'

@Injectable()
export class BannerService {
  async generateBanner(text: string): Promise<Buffer> {
    // Launch browser with proper configuration for Docker
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    })

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 1200, height: 630 })

      // Set content with proper HTML escaping for security
      const safeText = text.replace(/[&<>"']/g, match => {
        return (
          {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          }[match] || match
        )
      })

      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background-color: white;
              font-family: Arial, sans-serif;
              font-size: 48px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div>${safeText}</div>
        </body>
        </html>
      `)

      // Take screenshot and return as buffer
      return Buffer.from(
        await page.screenshot({
          type: 'png',
          fullPage: false,
          omitBackground: false,
        }),
      )
    } finally {
      await browser.close()
    }
  }
}
