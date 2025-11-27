import { useEffect, useMemo } from 'react';
import { Chance } from 'chance';
import style from './updater-state.module.scss';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { useAppReactiveNodes, useMainIpc } from '../context/context';
import { run } from '../../common/function';
import { isNever } from '../../common/type-assertion';
import { Icon } from '../framework/Icon';
import { classNames } from '../../common/react';
import { Button } from '../framework/Button';
import { ModalableProps, useModal } from '../framework/Modal';
import { Panel, PanelBody, PanelButtons, PanelHeader } from './Panel';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { isDev } from '../../main/app/util';

export function UpdaterStateC() {
  const updaterState = useReactiveVal(useAppReactiveNodes().updaterStateRemote);
  const updateModalNode = useModal({ Content: UpdateModal });

  const animationChoiceNode = useMemo(() => {
    return new ReactiveNode(style.shake);
  }, []);

  const animationChoice = useReactiveVal(animationChoiceNode);

  useEffect(() => {
    return startAnimationChooser(animationChoiceNode);
  }, [animationChoiceNode]);

  return (
    <div
      className={classNames(
        style.main,
        updaterState.tag === 'downloaded' ? style.mainDownloaded : null
      )}
    >
      {run(() => {
        switch (updaterState.tag) {
          case 'checking':
            return (
              <div className={style.checking}>
                <div className={style.icon}>
                  <Icon icon="faSpinner" />
                </div>
                Checking for updates
              </div>
            );
          case 'not-available':
            return <div>Up to date</div>;
          case 'available':
            return <div>Update available {updaterState.version}</div>;

          case 'downloading':
            return (
              <div>Downloading update {updaterState.percent.toFixed(0)}%</div>
            );
          case 'downloaded':
            return (
              <div
                className={classNames(
                  style.animationContainer,
                  animationChoice
                )}
              >
                <Button
                  label={`Update Now To ${updaterState.version}`}
                  onClick={() => {
                    updateModalNode.setValue(true);
                  }}
                />
              </div>
            );
          case 'error':
            return (
              <div className={style.error}>Error checking for updates</div>
            );
          default:
            return isNever(updaterState);
        }
      })}
    </div>
  );
}

function UpdateModal({ modalProps }: ModalableProps) {
  const mainIpc = useMainIpc();
  const updaterState = useReactiveVal(useAppReactiveNodes().updaterStateRemote);
  const version =
    updaterState.tag === 'downloaded' ? updaterState.version : null;
  return (
    <Panel>
      <PanelHeader>Update Available to {version}</PanelHeader>
      <PanelBody>
        <p>Updating will restart the application. Do you want to proceed?</p>
      </PanelBody>
      <PanelButtons>
        <Button
          label="Cancel"
          onClick={() => {
            modalProps?.closeModal();
          }}
        />
        <Button
          label="Restart and Update"
          onClick={() => {
            mainIpc.doQuitAndInstall();
          }}
        />
      </PanelButtons>
    </Panel>
  );
}

function startAnimationChooser(animationChoiceNode: ReactiveNode<string>) {
  const gapBetweenAnimations = isDev() ? 10e3 : 15 * 60e3;
  const lengthOfAnimation = 5e3;
  const animations = [style.shake, style.spinAndTwist, style.zoom];
  if (isDev()) {
    animations.length = 0;
    animations.push(style.spinAndTwist);
  }
  const chance = new Chance();
  let timeout1: number;
  let timeout2: number;

  const doAnimationChoice = () => {
    animationChoiceNode.setValue(chance.pickone(animations));
    timeout1 = window.setTimeout(() => {
      animationChoiceNode.setValue('');
    }, lengthOfAnimation);
    timeout2 = window.setTimeout(doAnimationChoice, gapBetweenAnimations);
  };

  doAnimationChoice();
  return () => {
    clearTimeout(timeout1);
    clearTimeout(timeout2);
  };
}
