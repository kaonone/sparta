import * as React from 'react';

import { TContext } from 'services/i18n/constants';

import { Lang } from '../../types';

interface IOption {
  value: Lang;
  label: string;
}

export function LanguageSelector() {
  const options: IOption[] = [
    { value: 'en', label: 'en' },
    { value: 'ru', label: 'ru' },
  ];
  const { locale, changeLanguage } = React.useContext(TContext);

  const handleChange = ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage && changeLanguage(value as Lang);
  };

  return (
    <div>
      <select value={locale} onChange={handleChange}>
        {options.map(({ value, label }, i) => (
          <option value={value} key={i}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
