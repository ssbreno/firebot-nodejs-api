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

export interface BannerAssets {
  fbotImageBase64: string
  backgroundImageBase64: string
}

export interface BannerData {
  worldInfo: WorldInfo
  guildInfo: GuildInfo
  boosted: BoostedBoss
}

export interface BannerOptions {
  lang?: string
  theme?: 'dark' | 'light' | 'firebot'
  showBoss?: boolean
  showLogo?: boolean
  width?: number
  height?: number
}

export interface Translations {
  [language: string]: {
    membersOnline: string
    boostedBoss: string
    playersOnline: string
    record: string
    founded: string
    avgLevel: string
    topVocation: string
    guildStats: string
  }
}
