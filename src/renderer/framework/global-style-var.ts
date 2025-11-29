import globalStyleVar from '../style/styleVar.scss';
import { StyleVarHelper } from './style-var-helper';

const globalStyleDef = {
  htmlFontSize: '10px',

  themePrimaryBgColor: '#c0e2fa',
  themeSecondaryBgColor: '#94cef6',

  themeTertiaryBgColor: '#1e455d',

  headerFontColor: 'white',
  headerFontOutlineColor: '#6aabe2',
  headerFontOutlineSize: '2px',

  buttonBgColor: '#dff1fd',
  buttonBgHoverColor: '#e8f5fe',
  buttonBgActiveColor: '#e8f5fe',

  buttonFontColor: '#69afdb',
  buttonFontHoverColor: '#68aedb',
  buttonFontActiveColor: '#1b6291',
  dropFileBgColor: '#09578a',
  dropFileActiveBgColor: '#0083d3',

  panelBorderColor: '#3d92dd',

  infoBgColor: '#abf3ff',
  warnBgColor: '#fdf3d0',
  errorBgColor: '#fdd0d0',
  successBgColor: '#d0fde0',
  messageFontColor: '#222',
  infoFgColor: '#004a59',
  warnFgColor: '#a27a00',
  errorFgColor: '#ad0000',
  successFgColor: '#00852e',

  mainFont: 'Arial, sans-serif',
  primaryFontColor: '#1c4966',
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
  editorBg: '#FFFFFF',
  editorPrimaryFontColor: '#000000',

  // local
  localVar1: null,
};
export const globalStyleDefLight = globalStyleDef;

export const globalStyleDefDark = {
  ...globalStyleDef,
  themePrimaryBgColor: '#b37892',
  themeSecondaryBgColor: '#7a5665',

  themeTertiaryBgColor: '#593a49',

  headerFontColor: '#593a49',
  headerFontOutlineColor: '#ffc1d9',
  headerFontOutlineSize: '2px',

  buttonBgColor: '#ffd9fc',
  buttonBgHoverColor: '#e1bad5',
  buttonBgActiveColor: '#7a5665',

  buttonFontColor: '#553946',
  buttonFontHoverColor: '#3a242f',
  buttonFontActiveColor: '#fedeff',

  dropFileBgColor: '#601f3e',
  dropFileActiveBgColor: '#d383a9',

  panelBorderColor: '#dc95b3',

  primaryFontColor: '#fee6ff',
  primaryFontFadeColor: '#999',
  secondaryFontColor: '#111',
  tertiaryFontColor: '#f3f3f3',
  omissionLineBg: '#4e5060',
  omissionValBg: '#707288',
  editorBg: '#2d2f3f',
  editorPrimaryFontColor: '#f8f8f2',
};

export const globalSh = new StyleVarHelper(globalStyleDefLight, globalStyleVar);
export type GlobalStyleVarName = keyof typeof globalStyleDef;

// _produceDebugStyleVar();

function _produceDebugStyleVar() {
  const rows = new Array<string>();
  for (const k of Object.keys(globalStyleDef)) {
    rows.push(`$${k}: declareVar(${k});`);
  }
  // eslint-disable-next-line no-console
  console.log(`\n\n${rows.join(`\n`)}\n\n`);
}
