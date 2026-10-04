import { ReactiveNode } from '../../../common/reactive/reactive-node';
import { ReactiveVal } from '../../../common/reactive/reactive-interface';
import { ParsedLnzResult, parseLnz } from '../../../common/petz/parser/main';
import {
  getSingleResourceEntryById,
  ResourceEntryId,
  resourceEntryIdToStringKey,
  ResourceEntryWithId,
} from '../../../common/petz/codecs/rsrc-utility';
import {
  decodeTextResource,
  encodeTextResource,
  LineEnding,
} from '../../../common/petz/codecs/text-resource';
import {
  fileTypeToExpectedSections,
  mkResourceDataSections,
  ResourceDataSectionType,
} from '../../../common/petz/file-types';
import { isNever } from '../../../common/type-assertion';
import { isNully } from '../../../common/null';
import { EditorFileInfo } from '../../../main/app/resource/project-manager';
import {
  ResourceData,
  SectionWithId,
} from '../../../main/app/pe-files/pe-files-util';

interface SectionDataBase {
  id: ResourceEntryId;
  // as loaded from file
  data: Uint8Array;
}

// only these are editable
export interface TextSectionDataNodes extends SectionDataBase {
  type: 'ascii';
  lineEnding: LineEnding;
  original: string;
  // nasty hack to get around recreating the hasChanged node
  originalHolder: { original: string };
  editNode: ReactiveNode<string>;
  parsedData: ReactiveVal<ParsedLnzResult>;
  isParsing: ReactiveVal<boolean>;
  hasChanged: ReactiveVal<boolean>;
}

// saved back as is
export interface BinarySectionDataNodes extends SectionDataBase {
  type: 'bitmap';
}

export type SectionDataNodes = TextSectionDataNodes | BinarySectionDataNodes;

export type SectionDataNodesMap = Map<string, SectionDataNodes>;

export function textSections(sections: SectionDataNodesMap) {
  return Array.from(sections.values()).filter(
    (it): it is TextSectionDataNodes => it.type === 'ascii'
  );
}

export function createOrUpdateSections(
  oldMap: SectionDataNodesMap,
  resourceData: ResourceData,
  editorFileInfo: EditorFileInfo
): SectionDataNodesMap {
  const newMap: SectionDataNodesMap = new Map();
  const sectionDefs = mkResourceDataSections(
    resourceData.rcDataAndEntry.rcData
  );
  for (const sectionName of fileTypeToExpectedSections[editorFileInfo.type]) {
    const sectionDef = sectionDefs[sectionName];
    const entryWithId = getSingleResourceEntryById(
      resourceData.resDirTable,
      sectionDef.idMatcher
    );
    if (isNully(entryWithId)) continue;
    const key = resourceEntryIdToStringKey(entryWithId.id);
    newMap.set(
      key,
      createOrUpdateSection(
        sectionDef.type,
        oldMap.get(key),
        entryWithId,
        editorFileInfo
      )
    );
  }
  return newMap;
}

function createOrUpdateSection(
  type: ResourceDataSectionType,
  oldSection: SectionDataNodes | undefined,
  entryWithId: ResourceEntryWithId,
  editorFileInfo: EditorFileInfo
): SectionDataNodes {
  const { id } = entryWithId;
  const { data } = entryWithId.entry;
  switch (type) {
    case 'bitmap':
      return { type, id, data };
    case 'ascii': {
      const { text: original, lineEnding } = decodeTextResource(data);
      if (oldSection?.type === 'ascii') {
        oldSection.originalHolder.original = original;
        oldSection.editNode.setValue(original);
        return { ...oldSection, data, original, lineEnding };
      }
      const editNode = new ReactiveNode(original);
      const isParsing = new ReactiveNode(false);
      const parsedData = editNode
        .fmapStrict((newVal) => {
          isParsing.setValue(true);
          return newVal;
        })
        .fmapStrict((newVal) => {
          const ret = parseLnz(newVal, editorFileInfo.type);
          isParsing.setValue(false);
          return ret;
        }, 2e3);
      const originalHolder = { original };
      return {
        type,
        id,
        data,
        lineEnding,
        original,
        originalHolder,
        editNode,
        parsedData,
        isParsing,
        hasChanged: editNode.fmapStrict(
          (str) => str !== originalHolder.original
        ),
      };
    }
    default:
      return isNever(type);
  }
}

export function sectionsToSave(sections: SectionDataNodesMap): SectionWithId[] {
  return Array.from(sections.values()).map((section) => ({
    id: section.id,
    data: sectionDataToSave(section),
  }));
}

function sectionDataToSave(section: SectionDataNodes): Uint8Array {
  switch (section.type) {
    case 'bitmap':
      return section.data;
    case 'ascii': {
      const text = section.editNode.getValue();
      return text === section.originalHolder.original
        ? section.data
        : encodeTextResource({ text, lineEnding: section.lineEnding });
    }
    default:
      return isNever(section);
  }
}
