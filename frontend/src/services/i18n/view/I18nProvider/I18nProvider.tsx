import * as React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';
import Polyglot from 'node-polyglot';
import { autobind } from 'core-decorators';

import { withProps } from 'utils/react/withProps';

import { ITranslateFunction, Lang, ITranslateKey } from '../../types';
import { DEFAULT_LANGUAGE, TContext, tKeys } from '../../constants';
import { phrasesByLocale as phrases } from '../../locales';

interface IOwnProps {
  phrasesByLocale: typeof phrases;
}

interface IState {
  locale: Lang;
}

type IProps = IOwnProps & RouteComponentProps;

class I18nProviderComponent extends React.Component<IProps> {
  public polyglot: Polyglot = new Polyglot({
    locale: DEFAULT_LANGUAGE,
    phrases: this.props.phrasesByLocale[DEFAULT_LANGUAGE],
  });

  public state = {
    translator: makeTranslator(this.polyglot),
    locale: DEFAULT_LANGUAGE,
  };

  public componentDidUpdate(prevProps: IProps, prevState: IState) {
    const { phrasesByLocale } = this.props;
    const { locale } = this.state;

    if (prevState.locale !== locale || prevProps.phrasesByLocale !== phrasesByLocale) {
      this.polyglot.locale(locale);
      this.polyglot.replace(phrasesByLocale[locale]);
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ translator: makeTranslator(this.polyglot) });
    }
  }

  public render() {
    const { children } = this.props;
    const { translator, locale } = this.state;
    return (
      <TContext.Provider
        value={{ t: translator, locale, tKeys, changeLanguage: this.changeLanguage }}
      >
        {children}
      </TContext.Provider>
    );
  }

  @autobind
  public changeLanguage(locale: Lang) {
    this.setState({ locale });
  }
}

function makeTranslator(polyglot: Polyglot): ITranslateFunction {
  return (
    phrase: ITranslateKey,
    smartCountOrInterpolationOptions?: number | Polyglot.InterpolationOptions,
  ) => {
    if (typeof phrase === 'string') {
      return polyglot.t(phrase, smartCountOrInterpolationOptions as any);
    }
    return polyglot.t(phrase.key, phrase.params);
  };
}

export const I18nProvider = withRouter(
  // needed for rerendering on route change
  withProps(I18nProviderComponent, { phrasesByLocale: phrases }),
);
