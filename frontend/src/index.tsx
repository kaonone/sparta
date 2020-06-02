import 'reflect-metadata';
import React from 'react';
import ReactDOM from 'react-dom';
import BN from 'bn.js';

import { Root } from 'core/Root';

function render(component: React.ReactElement): void {
  ReactDOM.render(component, window.document.getElementById('root'));
}

render(<Root />);

/* Hot Module Replacement API */
if (module.hot && process.env.NODE_ENV !== 'production') {
  module.hot.accept(['core/Root'], () => {
    // eslint-disable-next-line global-require
    const NextApp: typeof Root = require('core/Root').Root;
    render(<NextApp />);
  });
}

if (process.env.NODE_ENV !== 'production') {
  (window as any).BN = BN;
}
