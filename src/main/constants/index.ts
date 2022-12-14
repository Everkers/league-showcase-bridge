const requestedData: { key: string; endpoint: string }[] = [
  {
    key: 'championsWithSkins',
    endpoint: '/lol-champions/v1/inventories/{summonerId}/champions',
  },
  {
    key: 'profile',
    endpoint: '/lol-summoner/v1/current-summoner',
  },
  {
    key: 'RP',
    endpoint: '/lol-inventory/v1/wallet/RP',
  },
  {
    key: 'allCurrencies',
    endpoint: '/lol-inventory/v1/wallet/BLUE_ESSENCE',
  },
  {
    key: 'loot',
    endpoint: '/lol-loot/v1/player-loot',
  },
  {
    key: 'emailVerification',
    endpoint: '/lol-email-verification/v1/email',
  },
  {
    key: 'honorLevel',
    endpoint: '/lol-honor-v2/v1/profile',
  },
  {
    key: 'emotes',
    endpoint: '/lol-inventory/v1/inventory/emotes',
  },
  {
    key: 'rankedStats',
    endpoint: '/lol-ranked/v1/current-ranked-stats',
  },
];

export default requestedData;
