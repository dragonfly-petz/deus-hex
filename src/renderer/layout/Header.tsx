import style from './layout.module.scss';
import { Tabs } from './Tabs';
import { Button } from '../framework/Button';
import {
  useAppContext,
  useAppReactiveNodes,
  useMainIpc,
} from '../context/context';
import { Heading } from './text';
import logoImg from '../../../assets/logoImage.png';
import { ModalableProps, useModal } from '../framework/Modal';
import {
  Panel,
  PanelBody,
  PanelButtons,
  PanelHeader,
  PanelSpacer,
} from './Panel';
import { UpdaterStateC } from './UpdaterState';

export function Header() {
  const { appVersion } = useAppContext();
  const { localFontSizeAdjust } = useAppReactiveNodes();
  const aboutModalNode = useModal({ Content: AboutModal });

  return (
    <div className={style.header}>
      <div className={style.logoImg}>
        <img src={logoImg} alt="Logo" />
      </div>
      <div className={style.logoArea}>
        <div className={style.logo}>
          <Heading>Deus Hex</Heading>
        </div>
        <div className={style.version}>Beta v{appVersion}</div>
        <UpdaterStateC />
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
        <Button
          tooltip="About Deus Hex"
          icon="faInfo"
          onClick={() => {
            aboutModalNode.setValue(true);
          }}
        />
      </div>
    </div>
  );
}

function AboutModal({ modalProps }: ModalableProps) {
  const mainIpc = useMainIpc();

  return (
    <Panel>
      <PanelHeader>About Deus Hex</PanelHeader>
      <PanelBody>
        <h2>Documentation & Resources</h2>
        <p>
          You can find out more about Deus Hex{' '}
          <a
            onClick={() =>
              mainIpc.openLinkInBrowser(
                'https://petzhexing.weebly.com/deus-hex.html'
              )
            }
          >
            on this website
          </a>
          .
        </p>
        <p>
          The editor uses{' '}
          <a
            onClick={() => mainIpc.openLinkInBrowser('https://codemirror.net/')}
          >
            CodeMirror
          </a>
          . The basic controls/hotkeys for it are the ones listed in the
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          "standardKeymap" and "defaultKeymap" here:
          <a
            onClick={() =>
              mainIpc.openLinkInBrowser(
                'https://codemirror.net/docs/ref/#commands'
              )
            }
          >
            Standard and Default Keymap
          </a>{' '}
          and also the search controls listed here:
          <a
            onClick={() =>
              mainIpc.openLinkInBrowser(
                'https://codemirror.net/docs/ref/#search'
              )
            }
          >
            Search Keymap
          </a>
        </p>
        <PanelSpacer />
        <h3>Contributing to Deus Hex</h3>
        <p>
          Do you know CSS, HTML, React or TypeScript? Deus Hex is open source
          and welcomes new contributors. Visit the{' '}
          <a
            onClick={() =>
              mainIpc.openLinkInBrowser(
                'https://github.com/dragonfly-petz/deus-hex'
              )
            }
          >
            Git repository
          </a>{' '}
          for more information.
        </p>
      </PanelBody>
      <PanelButtons>
        <Button
          label="Close"
          onClick={() => {
            modalProps?.closeModal();
          }}
        />
      </PanelButtons>
    </Panel>
  );
}
