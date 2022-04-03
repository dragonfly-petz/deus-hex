import type { MainIpc } from '../../main/app/main-ipc';
import type { AppReactiveNodes } from './context';
import { E } from '../../common/fp-ts/fp';

export class AppHelper {
  constructor(
    private readonly mainIpc: MainIpc,
    private readonly appReactiveNodes: AppReactiveNodes
  ) {}

  async openEditorWithFile(file: string) {
    const currentEditorParams = this.appReactiveNodes.editorParams.getValue();
    if (currentEditorParams === null || E.isLeft(currentEditorParams)) {
      const newParams = await this.mainIpc.fileToEditorParams(file);
      this.appReactiveNodes.editorParams.setValue(newParams);
      this.appReactiveNodes.currentTabNode.setValue('editor');

      return null;
    }
    return this.mainIpc.openEditor(file);
  }
}
