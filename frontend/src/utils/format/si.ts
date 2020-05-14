export const SI = [
  {
    power: -24,
    value: 'y',
    text: 'yocto',
  },
  {
    power: -21,
    value: 'z',
    text: 'zepto',
  },
  {
    power: -18,
    value: 'a',
    text: 'atto',
  },
  {
    power: -15,
    value: 'f',
    text: 'femto',
  },
  {
    power: -12,
    value: 'p',
    text: 'pico',
  },
  {
    power: -9,
    value: 'n',
    text: 'nano',
  },
  {
    power: -6,
    value: 'µ',
    text: 'micro',
  },
  {
    power: -3,
    value: 'm',
    text: 'milli',
  },
  {
    power: 0,
    value: '-',
    text: 'Unit',
  },
  {
    power: 3,
    value: 'k',
    text: 'Kilo',
  },
  {
    power: 6,
    value: 'M',
    text: 'Mega',
  },
  {
    power: 9,
    value: 'G',
    text: 'Giga',
  },
  {
    power: 12,
    value: 'T',
    text: 'Tera',
  },
  {
    power: 15,
    value: 'P',
    text: 'Peta',
  },
  {
    power: 18,
    value: 'E',
    text: 'Exa',
  },
  {
    power: 21,
    value: 'Z',
    text: 'Zeta',
  },
  {
    power: 24,
    value: 'Y',
    text: 'Yotta',
  },
] as const;

export function findSi(tokenSymbol: string) {
  return SI.find(siItem => siItem.text === tokenSymbol) || SI[0];
}

export function getSiMidIndex() {
  return SI.findIndex(siItem => siItem.value === '-');
}

export function calcSi(text: string, decimals: number, forceUnit?: string) {
  if (forceUnit) {
    return findSi(forceUnit);
  }

  const mid = getSiMidIndex() - 1;

  const siDefIndex = mid + Math.ceil((text.length - decimals) / 3);

  return SI[siDefIndex] || SI[siDefIndex < 0 ? 0 : SI.length - 1];
}
