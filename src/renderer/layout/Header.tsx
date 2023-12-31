import style from './layout.module.scss';
import { Tabs } from './Tabs';
import { Button } from '../framework/Button';
import { useAppContext, useAppReactiveNodes } from '../context/context';
import { Heading } from './text';
import logoImg from '../../../assets/logoImage.png';

export function Header() {
  const { appVersion } = useAppContext();
  const { localFontSizeAdjust } = useAppReactiveNodes();

  return (
    <div className={style.header}>
      <div className={style.logoImg}>
        <img src={logoImg} alt="Logo" />
      </div>
      <div className={style.logoArea}>
        <div className={style.logo}>
          <Heading>Deus Hex</Heading>
        </div>
        <div className={style.version}>v{appVersion}</div>
      </div>
      <div className={style.tabsWrapper}>
        <Tabs />
      </div>
      <div className={style.zoom}>
        <Button
          tooltip="Reduce font size"
          icon="faMinus"
          onClick={() => {
            localFontSizeAdjust.setValueFn((it) => it - 1);
          }}
        />
        <Button
          tooltip="Increase font size"
          icon="faPlus"
          onClick={() => {
            localFontSizeAdjust.setValueFn((it) => it + 1);
          }}
        />
        <Button
          tooltip="Reset font size"
          icon="faSync"
          onClick={() => {
            localFontSizeAdjust.setValueFn(() => 0);
          }}
        />
      </div>
    </div>
  );
}
