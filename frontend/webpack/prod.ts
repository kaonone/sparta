/* eslint-disable import/no-extraneous-dependencies */
import merge from 'webpack-merge';

import common from './common';

module.exports = merge(common, {
  mode: 'production',
});
