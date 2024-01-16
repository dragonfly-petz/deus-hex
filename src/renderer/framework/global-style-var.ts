import globalStyleVar from '../style/styleVar.scss';
import { StyleVarHelper } from './style-var-helper';

const globalStyleDef = {
  htmlFontSize: '10px',

  themePrimaryBgColor: '#c0e2fa',
  themeSecondaryBgColor: '#94cef6',

  themeTertiaryBgColor: '#1e455d',

  headerFontColor: 'white',
  headerFontOutlineColor: '#6aabe2',
  headerFontOutlineSize: '3px',

  buttonBgColor: '#dff1fd',
  buttonBgHoverColor: '#e8f5fe',
  buttonBgActiveColor: '#e8f5fe',

  buttonFontColor: '#69afdb',
  buttonFontHoverColor: '#68aedb',
  buttonFontActiveColor: '#2f86be',

  panelBorderColor: '#3d92dd',

  infoBgColor: '#abf3ff',
  warnBgColor: '#fdf3d0',
  errorBgColor: '#fdd0d0',
  successBgColor: '#d0fde0',

  infoFgColor: '#004a59',
  warnFgColor: '#a27a00',
  errorFgColor: '#ad0000',
  successFgColor: '#00852e',

  mainFont: 'Arial, sans-serif',
  primaryFontColor: '#111',
  primaryFontFadeColor: '#999',
  secondaryFontColor: '#111',
  tertiaryFontColor: '#f3f3f3',
  headingFont: 'Comic Sans MS, Comic Sans, sans-serif',

  zoneHead: '#F7CDDB',
  zoneBody: '#F8E7CC',
  zoneFrontLegs: '#F7F9B3',
  zoneBackLegs: '#D4F8CC',
  zoneTail: '#CCF2F8',
  zoneMisc: '#F8CCF5',
  omissionLineBg: '#ebebeb',
  omissionValBg: '#d0d0d0',

  // local
  localVar1: null,
};
produceStyleVar();

export const globalSh = new StyleVarHelper(globalStyleDef, globalStyleVar);
export type GlobalStyleVarName = keyof typeof globalStyleDef;

function produceStyleVar() {
  const rows = new Array<string>();
  for (const k of Object.keys(globalStyleDef)) {
    rows.push(`$${k}: declareVar(${k});`);
  }
  // eslint-disable-next-line no-console
  console.log(`\n\n${rows.join(`\n`)}\n\n`);
}
