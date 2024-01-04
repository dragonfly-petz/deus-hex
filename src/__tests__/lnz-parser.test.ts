import * as E from 'fp-ts/Either';
import { globalLogger, initGlobalLogger } from '../common/logger';
import { getTestResourcesPath } from '../common/asset-path';
import { throwFromEither } from '../common/fp-ts/either';
import { getFileInfoAndData } from '../main/app/pe-files/pe-files-util';
import {
  getSingleResourceEntryById,
  resDataEntryToString,
} from '../common/petz/codecs/rsrc-utility';
import { isNotNully, isNully } from '../common/null';
import { parseLnz, serializeLnz } from '../common/petz/parser/main';
import {
  mkResourceDataSections,
  ResourceDataSectionName,
} from '../common/petz/file-types';

initGlobalLogger('test');
describe('lnz parsing', () => {
  // eslint-disable-next-line jest/expect-expect
  test('parse and serialize cat', async () => {
    await testSection('lnzCat', 28, 1, { size: 20, omitted: 71 });
  });
  // eslint-disable-next-line jest/expect-expect
  test('parse and serialize kitten', async () => {
    await testSection('lnzKitten', 13, 8, { size: 0, omitted: null });
  });
});

async function testSection(
  idQueryKey: ResourceDataSectionName,
  sectionsExpected: number,
  paintBallzIndex: number,
  omissions: {
    size: number;
    omitted: number | null;
  }
) {
  const filePath = getTestResourcesPath('Orange Shorthair.cat');
  globalLogger.info(`opening file at ${filePath}`);

  const fileInfo = throwFromEither(await getFileInfoAndData(filePath));
  const idQuery = mkResourceDataSections(fileInfo.rcDataAndEntry.rcData)[
    idQueryKey
  ].idMatcher;
  const entry = getSingleResourceEntryById(fileInfo.resDirTable, idQuery);
  expect(entry).not.toEqual(null);
  if (isNully(entry)) {
    return;
  }
  const original = resDataEntryToString(entry.entry);
  const parsed = parseLnz(original, 'catz');
  expect(E.isRight(parsed)).toEqual(true);
  if (E.isLeft(parsed)) return;
  expect(parsed.right.structured.length).toEqual(sectionsExpected);
  const paintBallzSection = parsed.right.structured[paintBallzIndex];
  expect(paintBallzSection.lineContent).toEqual('Paint Ballz');
  if (paintBallzSection.tag !== 'section') {
    throw new Error('Expected section');
  }
  if (paintBallzSection.sectionType !== 'paintBallz') {
    throw new Error('Expected paintBallz');
  }

  const firstLine = paintBallzSection.lines[0];
  expect((firstLine.lineContent as any).content[0]).toEqual(['ballRef', 2]);
  expect((firstLine.lineContent as any).ballRef).toEqual(2);

  expect(parsed.right.omissionsSet.size).toEqual(omissions.size);
  if (isNotNully(omissions.omitted)) {
    expect(parsed.right.omissionsSet.has(omissions.omitted)).toEqual(true);
  }

  const ser = serializeLnz(parsed.right);
  expect(ser).toEqual(original);
}
