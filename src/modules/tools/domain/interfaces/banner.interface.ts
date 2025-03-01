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

export interface Translations {
  [key: string]: {
    membersOnline: string
    boostedBoss: string
    playersOnline: string
    record: string
  }
}
