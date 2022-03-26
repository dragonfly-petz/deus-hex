import globalStyleVar from '../style/styleVar.scss';
import { StyleVarHelper } from './style-var-helper';

const globalStyleDef = {
  htmlFontSize: '10px',
  infoBgColor: 'blue',
  warnBgColor: 'orange',
  errorBgColor: 'red',
  successBgColor: 'green',

  // local
  fmBgColor: null,
};
export const globalSh = new StyleVarHelper(globalStyleDef, globalStyleVar);
