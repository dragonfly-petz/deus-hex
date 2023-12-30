import * as E from 'fp-ts/Either';
import { initGlobalLogger } from '../common/logger';
import { getTestResourcesPath } from '../common/asset-path';
import { throwFromEither } from '../common/fp-ts/either';
import { getFileInfoAndData } from '../main/app/pe-files/pe-files-util';
import {
  getResourceEntryById,
  resDataEntryToString,
} from '../common/petz/codecs/rsrc-utility';
import { resourceDataSections } from '../common/petz/file-types';
import { isNully } from '../common/null';
import { parseLnz } from '../common/petz/parser/main';

initGlobalLogger('test');
describe('paint ballz', () => {
  test('parse and serialize', async () => {
    const filePath = getTestResourcesPath('OrangeShorthair.cat');
    const fileInfo = throwFromEither(await getFileInfoAndData(filePath));
    const entry = getResourceEntryById(
      fileInfo.resDirTable,
      resourceDataSections.lnzCat.idMatcher
    );
    expect(entry).not.toEqual(null);
    if (isNully(entry)) {
      return;
    }
    const original = resDataEntryToString(entry.entry);
    const parsed = parseLnz(original);
    expect(E.isRight(parsed)).toEqual(true);
    if (E.isLeft(parsed)) return;
    expect(parsed.right.length).toEqual(28);
    const paintBallzSection = parsed.right[1];
    expect(paintBallzSection.lineContent).toEqual('Paint Ballz');
    if (paintBallzSection.tag !== 'section') {
      throw new Error('Expected section');
    }
    if (paintBallzSection.sectionType !== 'paintBallz') {
      throw new Error('Expected paintBallz');
    }

    const firstLine = paintBallzSection.lines[0];
    expect(firstLine.lineContent[0]).toEqual(['baseBall', 2]);
  });
});
