export interface RespawnItem {
  alias: string
  created_at: string
  deleted_at?: {
    time: string
    valid: boolean
  }
  description: string
  id: string
  name: string
  premium: boolean
  updated_at: string
}

export interface RespawnResponse {
  respawns: RespawnItem[]
}

export interface RashidLocation {
  city: string
  date: string
}
