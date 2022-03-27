import { useEffect } from 'react';
import { FunctionalComponent } from './render';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import style from './Modal.module.scss';
import { useAppReactiveNodes } from '../context/context';
import { uuidV4 } from '../../common/uuid';

export interface ModalableProps {
  closeModal?: () => void;
}

export interface ModalConfig {
  Content: FunctionalComponent<ModalableProps>;
  closable?: boolean;
}

export interface ModalDef {
  id: string;
  modalStateNode: ReactiveNode<boolean>;
  config: ModalConfig;
}

export const GlobalModals = () => {
  const modalsMap = useReactiveVal(useAppReactiveNodes().modalsNode);
  const modals = Array.from(modalsMap.values());
  return (
    <>
      {modals.map((it) => {
        return (
          <ModalC
            key={it.id}
            modalStateNode={it.modalStateNode}
            {...it.config}
          />
        );
      })}
    </>
  );
};
const ModalC = ({
  Content,
  closable = true,
  modalStateNode,
}: {
  modalStateNode: ReactiveNode<boolean>;
} & ModalConfig) => {
  const show = useReactiveVal(modalStateNode);
  if (!show) {
    return null;
  }

  return (
    <div
      className={style.modalWrapper}
      onClick={() => {
        if (closable) {
          modalStateNode.setValue(false);
        }
      }}
    >
      <div className={style.modal}>
        <Content closeModal={() => modalStateNode.setValue(false)} />
      </div>
    </div>
  );
};

export function useModal(config: ModalConfig) {
  const { modalsNode } = useAppReactiveNodes();
  const modalStateNode = useMkReactiveNodeMemo(false);
  useEffect(() => {
    const modalDef: ModalDef = {
      id: uuidV4(),
      modalStateNode,
      config,
    };
    modalsNode.setValueFn((it) => {
      it.set(modalDef.id, modalDef);
      return it;
    });
    return () => {
      modalsNode.setValueFn((it) => {
        it.delete(modalDef.id);
        return it;
      });
    };
  }, [config, modalStateNode, modalsNode]);
  return modalStateNode;
}
