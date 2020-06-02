import RobotoThinTtf from './fonts/Roboto/Roboto-Thin.ttf';
import RobotoThinSvg from './fonts/Roboto/Roboto-Thin.svg';
import RobotoThinWoff from './fonts/Roboto/Roboto-Thin.woff';
import RobotoThinItalicTtf from './fonts/Roboto/Roboto-ThinItalic.ttf';
import RobotoThinItalicSvg from './fonts/Roboto/Roboto-ThinItalic.svg';
import RobotoThinItalicWoff from './fonts/Roboto/Roboto-ThinItalic.woff';
import RobotoLightTtf from './fonts/Roboto/Roboto-Light.ttf';
import RobotoLightSvg from './fonts/Roboto/Roboto-Light.svg';
import RobotoLightWoff from './fonts/Roboto/Roboto-Light.woff';
import RobotoLightItalicTtf from './fonts/Roboto/Roboto-LightItalic.ttf';
import RobotoLightItalicSvg from './fonts/Roboto/Roboto-LightItalic.svg';
import RobotoLightItalicWoff from './fonts/Roboto/Roboto-LightItalic.woff';
import RobotoRegularTtf from './fonts/Roboto/Roboto-Regular.ttf';
import RobotoRegularSvg from './fonts/Roboto/Roboto-Regular.svg';
import RobotoRegularWoff from './fonts/Roboto/Roboto-Regular.woff';
import RobotoItalicTtf from './fonts/Roboto/Roboto-Italic.ttf';
import RobotoItalicSvg from './fonts/Roboto/Roboto-Italic.svg';
import RobotoItalicWoff from './fonts/Roboto/Roboto-Italic.woff';
import RobotoMediumTtf from './fonts/Roboto/Roboto-Medium.ttf';
import RobotoMediumSvg from './fonts/Roboto/Roboto-Medium.svg';
import RobotoMediumWoff from './fonts/Roboto/Roboto-Medium.woff';
import RobotoMediumItalicTtf from './fonts/Roboto/Roboto-MediumItalic.ttf';
import RobotoMediumItalicSvg from './fonts/Roboto/Roboto-MediumItalic.svg';
import RobotoMediumItalicWoff from './fonts/Roboto/Roboto-MediumItalic.woff';
import RobotoBoldTtf from './fonts/Roboto/Roboto-Bold.ttf';
import RobotoBoldSvg from './fonts/Roboto/Roboto-Bold.svg';
import RobotoBoldWoff from './fonts/Roboto/Roboto-Bold.woff';
import RobotoBoldItalicTtf from './fonts/Roboto/Roboto-BoldItalic.ttf';
import RobotoBoldItalicSvg from './fonts/Roboto/Roboto-BoldItalic.svg';
import RobotoBoldItalicWoff from './fonts/Roboto/Roboto-BoldItalic.woff';
import RobotoBlackTtf from './fonts/Roboto/Roboto-Black.ttf';
import RobotoBlackSvg from './fonts/Roboto/Roboto-Black.svg';
import RobotoBlackWoff from './fonts/Roboto/Roboto-Black.woff';
import RobotoBlackItalicTtf from './fonts/Roboto/Roboto-BlackItalic.ttf';
import RobotoBlackItalicSvg from './fonts/Roboto/Roboto-BlackItalic.svg';
import RobotoBlackItalicWoff from './fonts/Roboto/Roboto-BlackItalic.woff';

const generateFontRule = (
  ttfUrl: string,
  svgUrl: string,
  woffUrl: string,
  fontWeight: number,
  fontStyle = 'normal',
) => ({
  fontFamily: 'Roboto',
  fontStyle,
  fontWeight,
  src: `
    url('${ttfUrl}') format('ttf'),
    url('${svgUrl}') format('svg'),
    url('${woffUrl}') format('woff')
  `,
});

export const robotoThin = generateFontRule(RobotoThinTtf, RobotoThinSvg, RobotoThinWoff, 100);

export const robotoThinItalic = generateFontRule(
  RobotoThinItalicTtf,
  RobotoThinItalicSvg,
  RobotoThinItalicWoff,
  100,
  'italic',
);

export const robotoLight = generateFontRule(RobotoLightTtf, RobotoLightSvg, RobotoLightWoff, 300);

export const robotoLightItalic = generateFontRule(
  RobotoLightItalicTtf,
  RobotoLightItalicSvg,
  RobotoLightItalicWoff,
  300,
  'italic',
);

export const robotoRegular = generateFontRule(
  RobotoRegularTtf,
  RobotoRegularSvg,
  RobotoRegularWoff,
  400,
);

export const robotoItalic = generateFontRule(
  RobotoItalicTtf,
  RobotoItalicSvg,
  RobotoItalicWoff,
  400,
  'italic',
);

export const robotoMedium = generateFontRule(
  RobotoMediumTtf,
  RobotoMediumSvg,
  RobotoMediumWoff,
  500,
);

export const robotoMediumItalic = generateFontRule(
  RobotoMediumItalicTtf,
  RobotoMediumItalicSvg,
  RobotoMediumItalicWoff,
  500,
  'italic',
);

export const robotoBold = generateFontRule(RobotoBoldTtf, RobotoBoldSvg, RobotoBoldWoff, 700);

export const robotoBoldItalic = generateFontRule(
  RobotoBoldItalicTtf,
  RobotoBoldItalicSvg,
  RobotoBoldItalicWoff,
  700,
  'italic',
);

export const robotoBlack = generateFontRule(RobotoBlackTtf, RobotoBlackSvg, RobotoBlackWoff, 900);

export const robotoBlackItalic = generateFontRule(
  RobotoBlackItalicTtf,
  RobotoBlackItalicSvg,
  RobotoBlackItalicWoff,
  900,
  'italic',
);
