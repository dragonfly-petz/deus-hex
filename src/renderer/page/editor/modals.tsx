import { ModalContentProps, useModal } from '../../framework/Modal';
import { ReactiveVal } from '../../../common/reactive/reactive-interface';
import { useMainIpc } from '../../context/context';
import { useReactiveVal } from '../../reactive-state/reactive-hooks';
import { isNully } from '../../../common/null';
import {
  Panel,
  PanelBody,
  PanelButtons,
  PanelHeader,
} from '../../layout/Panel';
import { Button } from '../../framework/Button';

export interface OverwriteModalOpts {
  continue: () => void;
  filePath: string;
}

export const useOverwriteModal = (
  onContinueNode: ReactiveVal<null | OverwriteModalOpts>
) => {
  return useModal({
    Content: (props) => (
      <FileExistsModal onContinueNode={onContinueNode} {...props.modalProps} />
    ),
    closable: true,
  });
};

export function FileExistsModal({
  closeModal,
  onContinueNode,
}: ModalContentProps & {
  onContinueNode: ReactiveVal<null | OverwriteModalOpts>;
}) {
  const mainIpc = useMainIpc();
  const onContinue = useReactiveVal(onContinueNode);
  if (isNully(onContinue)) {
    return null;
  }
  return (
    <Panel>
      <PanelHeader>File Already Exists</PanelHeader>
      <PanelBody>
        The file {onContinue.filePath} already exists, would you like to
        overwrite it?
      </PanelBody>
      <PanelButtons>
        <Button label="Cancel" onClick={closeModal} />
        <Button
          label="Open Folder"
          onClick={() => {
            mainIpc.openFileInExplorer(onContinue.filePath);
          }}
        />

        <Button label="Continue" onClick={onContinue.continue} />
      </PanelButtons>
    </Panel>
  );
}
