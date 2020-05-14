import React, { useState, useCallback } from 'react';
import BN from 'bn.js';
import { Observable } from 'rxjs';

import { useApi } from 'services/api';
import { useTranslate, tKeys as tKeysAll, ITranslateKey } from 'services/i18n';
import { useSubscribable } from 'utils/react';
import { Loading } from 'components/Loading';
import { Hint } from 'components/Hint/Hint';

import { PTokenExchangingConfirmation } from '../PTokenExchangingConfirmation/PTokenExchangingConfirmation';
import {
  PTokenExchangingForm,
  ISubmittedFormData,
  IFormData,
  IProps as PTokenExchangingFormProps,
  fieldNames,
} from '../PTokenExchangingForm/PTokenExchangingForm';

export type IProps<ExtraFormData> = Pick<
  PTokenExchangingFormProps<ExtraFormData>,
  'isReadOnlySource' | 'formCalculations'
> & {
  title: string;
  sourcePlaceholder: string;
  confirmMessageTKey:
    | string
    | ((
        values: (ISubmittedFormData & Omit<ExtraFormData, keyof ISubmittedFormData>) | null,
      ) => Observable<string>);
  additionalFields?: React.ReactNode[];
  initialValues?: ExtraFormData;
  getMaxSourceValue: (account: string) => Observable<BN>;
  getMinSourceValue: (account: string) => Observable<BN>;
  onExchangeRequest: (
    account: string,
    values: ISubmittedFormData & Omit<ExtraFormData, keyof ISubmittedFormData>,
  ) => Promise<void>;
  onCancel: () => void;
  validateForm?(
    values: ExtraFormData & IFormData,
  ): { [key in keyof (ExtraFormData & IFormData)]?: ITranslateKey };
};

const tKeysApp = tKeysAll.app;

function PTokenExchanging<ExtraFormData extends Record<string, any> = {}>(
  props: IProps<ExtraFormData>,
) {
  const {
    title,
    isReadOnlySource,
    sourcePlaceholder,
    getMaxSourceValue,
    getMinSourceValue,
    confirmMessageTKey,
    onExchangeRequest,
    onCancel,
    additionalFields,
    initialValues,
    validateForm,
    formCalculations,
  } = props;

  const { t } = useTranslate();

  const api = useApi();
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, [], null);
  const [values, setValues] = useState<
    (ISubmittedFormData & Omit<ExtraFormData, keyof ISubmittedFormData>) | null
  >(null);

  const handlePTokenExchangingConfirmationClick = useCallback(async () => {
    if (!account) {
      throw new Error('You need to connect to Ethereum wallet');
    }

    if (!values) {
      throw new Error('Form is empty');
    }

    const { sourceAmount, ...rest } = values as ISubmittedFormData & ExtraFormData;

    await onExchangeRequest(account, {
      sourceAmount: sourceAmount || new BN(0),
      ...rest,
    });

    setValues(null);
    onCancel();
  }, [onExchangeRequest, onCancel, api, account, values]);

  const handlePTokenExchangingConfirmationCancel = useCallback(() => {
    setValues(null);
  }, []);

  return (
    <>
      <Loading meta={accountMeta} progressVariant="circle">
        {account ? (
          <>
            <PTokenExchangingForm<ExtraFormData>
              account={account}
              title={title}
              isReadOnlySource={isReadOnlySource}
              sourcePlaceholder={sourcePlaceholder}
              getMaxSourceValue={getMaxSourceValue}
              getMinSourceValue={getMinSourceValue}
              onSubmit={setValues}
              onCancel={onCancel}
              additionalFields={additionalFields}
              additionalInitialValues={initialValues}
              validateForm={validateForm}
              formCalculations={formCalculations}
            />
            <PTokenExchangingConfirmation
              isOpen={!!values}
              messageTKey={confirmMessageTKey}
              onConfirm={handlePTokenExchangingConfirmationClick}
              onCancel={handlePTokenExchangingConfirmationCancel}
              values={values}
            />
          </>
        ) : (
          <Hint>{t(tKeysApp.connectingWarning.getKey())}</Hint>
        )}
      </Loading>
    </>
  );
}

export { PTokenExchanging, ISubmittedFormData, fieldNames };
