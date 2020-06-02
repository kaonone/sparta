const NUMBER_REGEX = new RegExp('(\\d+?)(?=(\\d{3})+(?!\\d)|$)', 'g');

export function formatDecimal(value: string): string {
  const isNegative = value[0].startsWith('-');
  const matched = isNegative ? value.substr(1).match(NUMBER_REGEX) : value.match(NUMBER_REGEX);

  return matched ? `${isNegative ? '-' : ''}${matched.join(',')}` : value;
}
