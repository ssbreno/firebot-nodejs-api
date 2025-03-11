import { Injectable } from '@nestjs/common'
import * as puppeteer from 'puppeteer'

@Injectable()
export class BannerService {
  async generateBanner(text: string): Promise<Buffer> {
    const browser = await puppeteer.launch()
    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 1200, height: 630 })

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
            <div>${text}</div>
          </body>
        </html>
      `)

      return Buffer.from(await page.screenshot({ type: 'png' }))
    } finally {
      await browser.close()
    }
  }
}
