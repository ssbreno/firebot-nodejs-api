import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { RespawnItem, RespawnResponse } from '../../domain/types/respawn.types'

interface AuthToken {
  access_token: string
  expires_in: number
  token_type: string
}

@Injectable()
export class FirebotIntegration {
  private readonly apiUrl: string
  private readonly logger = new Logger(FirebotIntegration.name)
  private token: string | null = null
  private tokenExpiry: Date | null = null

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const apiUrl = this.configService.get<string>('FIREBOT_API_URL')
    if (!apiUrl) {
      throw new Error('FIREBOT_API_URL environment variable is not defined')
    }
    this.apiUrl = apiUrl
  }

  private async authenticate(): Promise<string> {
    try {
      if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.token
      }

      const email = this.configService.get<string>('FIREBOT_API_EMAIL')
      const password = this.configService.get<string>('FIREBOT_API_PASSWORD')
      if (!email || !password) {
        throw new Error('Firebot API credentials not configured')
      }

      const { data } = await firstValueFrom(
        this.httpService.post<AuthToken>(`${this.apiUrl}/api/login`, {
          email,
          password,
        }),
      )

      if (!data.access_token) {
        throw new Error('Failed to obtain auth token')
      }

      this.token = data.access_token

      const expiresInMs = (data.expires_in - 300) * 1000
      this.tokenExpiry = new Date(Date.now() + expiresInMs)

      this.logger.debug('Successfully authenticated with Firebot API')
      return this.token
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`)
      throw new Error(`Failed to authenticate: ${error.message}`)
    }
  }

  private async authenticatedRequest<T>(url: string): Promise<T> {
    try {
      const token = await this.authenticate()
      const { data } = await firstValueFrom(
        this.httpService.get<T>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      )
      return data
    } catch (error) {
      if (error.response?.status === 401) {
        this.logger.warn('Token expired, clearing and retrying')
        this.token = null
        this.tokenExpiry = null

        try {
          const token = await this.authenticate()
          const { data } = await firstValueFrom(
            this.httpService.get<T>(url, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          )
          return data
        } catch (retryError) {
          throw new Error(`Request failed after retry: ${retryError.message}`)
        }
      }

      throw error
    }
  }

  async fetchRespawns(): Promise<RespawnResponse> {
    try {
      const response = await this.authenticatedRequest<RespawnItem[]>(
        `${this.apiUrl}/api/respawns/list-all`,
      )
      const respawnResponse: RespawnResponse = {
        respawns: Array.isArray(response) ? response : [],
      }
      return respawnResponse
    } catch (error) {
      this.logger.error(`Error fetching respawns: ${error.message}`)
      return { respawns: [] }
    }
  }

  async fetchRashidLocation(): Promise<any> {
    try {
      return await this.authenticatedRequest<any>(`${this.apiUrl}/api/gamedata/rashid`)
    } catch (error) {
      this.logger.error(`Error fetching Rashid location: ${error.message}`)
      throw error
    }
  }

  async fetchWorldChanges(world: string): Promise<any> {
    try {
      return await this.authenticatedRequest<any>(
        `${this.apiUrl}/api/gamedata/active-world-changes?world=${encodeURIComponent(world)}`,
      )
    } catch (error) {
      this.logger.error(`Error fetching world changes: ${error.message}`)
      throw error
    }
  }
}
