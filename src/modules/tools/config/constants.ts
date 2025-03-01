import { Translations } from '../domain/interfaces/banner.interface'

export const translations: Translations = {
  pt: {
    membersOnline: 'Membros Online',
    boostedBoss: 'Boss do Dia',
    playersOnline: 'Jogadores Online',
    record: 'Recorde',
    founded: 'Fundado em',
    avgLevel: Buffer.from('Nível Médio').toString('base64'),
    topVocation: Buffer.from('Vocação Principal').toString('base64'),
    guildStats: Buffer.from('Estatísticas da Guild').toString('base64'),
  },
  en: {
    membersOnline: 'Members Online',
    boostedBoss: 'Boosted Boss',
    playersOnline: 'Players Online',
    record: 'Record',
    founded: 'Founded',
    avgLevel: 'Average Level',
    topVocation: 'Top Vocation',
    guildStats: 'Guild Statistics',
  },
}
