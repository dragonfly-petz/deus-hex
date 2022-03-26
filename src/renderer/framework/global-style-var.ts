import globalStyleVar from '../style/styleVar.scss';
import { StyleVarHelper } from './style-var-helper';

const globalStyleDef = {
  htmlFontSize: '10px',

  themePrimaryBgColor: '#c0e2fa',
  themeSecondaryBgColor: '#94cef6',

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

  infoBgColor: 'blue',
  warnBgColor: 'orange',
  errorBgColor: 'red',
  successBgColor: 'green',

  mainFont: 'Arial, sans-serif',
  mainFontColor: '#111',
  headingFont: 'Comic Sans MS, Comic Sans, sans-serif',

  // local
  fmBgColor: null,
};
produceStyleVar();

export const globalSh = new StyleVarHelper(globalStyleDef, globalStyleVar);

function produceStyleVar() {
  const rows = new Array<string>();
  for (const k of Object.keys(globalStyleDef)) {
    rows.push(`$${k}: declareVar(${k});`);
  }
  console.log(`\n\n${rows.join(`\n`)}\n\n`);
}
