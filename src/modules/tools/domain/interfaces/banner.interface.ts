export interface WorldInfo {
  world: {
    name: string
    players_online: number
    record_players: number
    location: string
    pvp_type: string
  }
}

export interface GuildInfo {
  guild: {
    name: string
    players_online: number
    members_total: number
    founded: string
    description: string
  }
}

export interface BoostedBoss {
  boostable_bosses: {
    boosted: {
      name: string
      image_url: string
    }
  }
}

export interface BannerOptions {
  lang?: string
  theme?: string
  showBoss?: boolean
  showLogo?: boolean
  width?: number
  height?: number
}

export interface BannerAssets {
  fbotImageBase64: string
  backgroundImageBase64: string
}

export interface RashidLocation {
  city: string
  day?: string
  place?: string
  updated_at?: string
}

export interface WorldChanges {
  changes: Array<{
    id: string
    type: string
    description: string
    created_at: string
    updated_at: string
  }>
}

export interface BannerData {
  worldInfo: any
  guildInfo: any
  boosted: any
  rashidLocation: RashidLocation
  worldChanges: WorldChanges
  yasirIsActive: boolean
  updateDate: string
}

export interface Translations {
  [lang: string]: {
    membersOnline: string
    playersOnline: string
    record: string
    boostedBoss: string
    founded: string
    avgLevel: string
    topVocation: string
    guildStats: string
  }
}
