import style from './Projects.module.scss';
import { useAppReactiveNodes, useMainIpc } from '../context/context';
import { Query, RenderQuery, useMkQueryMemo } from '../framework/Query';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import { DropFile } from '../framework/form/DropFile';
import { Button } from '../framework/Button';
import { isNully, nullable } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import {
  ActionBar,
  ActionDef,
  ActionsNode,
  useAddActions,
} from '../layout/ActionBar';
import { throwRejectionK } from '../../common/promise';
import { Panel, PanelBody, PanelButtons, PanelHeader } from '../layout/Panel';
import { ger } from '../../common/error';
import { ModalContentProps, useModal } from '../framework/Modal';
import { E } from '../../common/fp-ts/fp';
import { objectEntries } from '../../common/object';
import { allFileTypeExtensions, FileType } from '../../common/petz/file-types';
import { Navigation, NavigationDef } from '../layout/NavgationBar';
import type {
  ProjectResult,
  ProjectsByType,
} from '../../main/app/resource/project-manager';
import { sumBy } from '../../common/array';
import { FormInput, FormItem, FormLabel } from '../framework/form/form';
import { TextInput } from '../framework/form/TextInput';
import { renderResult } from '../framework/result';

const navigationNames = ['overview', 'catz', 'dogz', 'clothes'] as const;
export type ProjectsPage = typeof navigationNames[number];

interface NavigationDeps {
  projectsByType: ProjectsByType;
  actionsNode: ActionsNode;
  // eslint-disable-next-line react/no-unused-prop-types
  projectsQuery: TabDefs['projectsQuery'];
}

const useMkNavigation = (): NavigationDef<ProjectsPage, NavigationDeps> => {
  const node = useAppReactiveNodes().currentProjectsPage;
  return {
    names: navigationNames,
    node,
    items: {
      overview: {
        name: 'Overview',
        Content: OverviewPage,
      },
      catz: {
        name: 'Catz',
        Content: (props) => <SpecificPage type="catz" {...props} />,
      },
      dogz: {
        name: 'Dogz',
        Content: (props) => <SpecificPage type="dogz" {...props} />,
      },
      clothes: {
        name: 'Clothes',
        Content: (props) => <SpecificPage type="clothes" {...props} />,
      },
    },
  };
};

function useGetDeps() {
  const mainIpc = useMainIpc();

  const navigation = useMkNavigation();
  const projectsQuery = useMkQueryMemo(() => mainIpc.getProjects());
  const actionsNode: ActionsNode = useMkReactiveNodeMemo(new Map());

  return { navigation, projectsQuery, actionsNode };
}

type TabDefs = ReturnType<typeof useGetDeps>;

export function mkProjectsTab(): TabDef<TabDefs> {
  return {
    tabName: 'Projects',
    useGetDeps,
    TabContent: ProjectsC,
    TabRightBar,
    TabLeftBar,
  };
}

export const ProjectsC = ({
  projectsQuery,
  navigation,
  actionsNode,
}: TabDefs) => {
  return (
    <div className={style.main}>
      <RenderQuery
        query={projectsQuery}
        OnSuccess={({ value }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const currentPage = useReactiveVal(navigation.node);
          const { Content } = navigation.items[currentPage];
          return (
            <Content
              projectsByType={value}
              actionsNode={actionsNode}
              projectsQuery={projectsQuery}
            />
          );
        }}
      />
    </div>
  );
};
const TabLeftBar = ({ navigation }: TabDefs) => {
  return (
    <Navigation
      navigationNames={navigation.names}
      items={navigation.items}
      node={navigation.node}
    />
  );
};

const TabRightBar = ({ actionsNode, projectsQuery }: TabDefs) => {
  const newProjectModalNode = useModal({
    Content: (rest) => (
      // eslint-disable-next-line react/destructuring-assignment
      <NewProjectForm projectsQuery={projectsQuery} {...rest.modalProps} />
    ),
  });

  useAddActions(actionsNode, (actions) => {
    actions.push(
      {
        label: 'Refresh',
        icon: 'faSync',
        key: 'refresh',
        tooltip: 'Refresh all info',
        action: () => {
          return projectsQuery.reload();
        },
      },
      {
        label: 'New Project',
        icon: 'faFolderPlus',
        key: 'newProject',
        tooltip: 'Create a new project',
        action: async () => {
          newProjectModalNode.setValue(true);
          return E.right(null);
        },
      }
    );
  });
  return <ActionBar actions={actionsNode} />;
};

const NewProjectForm = ({
  closeModal,
  projectsQuery,
}: ModalContentProps & { projectsQuery: Query<ProjectsByType> }) => {
  const mainIpc = useMainIpc();
  const pickedPathNode = useMkReactiveNodeMemo(nullable<string>());
  const projectNameNode = useMkReactiveNodeMemo('');

  return (
    <Panel>
      <PanelHeader>New Project</PanelHeader>
      <PanelBody>
        <FormItem>
          <>
            <FormLabel>Project Name</FormLabel>
            <FormInput>
              <TextInput valueNode={projectNameNode} />
            </FormInput>
          </>
        </FormItem>
        <FormItem>
          <DropFile
            validExtensions={new Set(allFileTypeExtensions)}
            valueNode={pickedPathNode}
          />
        </FormItem>
      </PanelBody>
      <PanelButtons>
        <Button
          label="Save"
          onClick={() => {
            const val = pickedPathNode.getValue();
            if (isNully(val)) return;
            if (projectNameNode.getValue().length < 1) return;
            throwRejectionK(async () => {
              const res = await ger.withFlashMessage(
                mainIpc.createProjectFromFile(val, projectNameNode.getValue())
              );
              if (E.isRight(res)) {
                closeModal();
                // noinspection ES6MissingAwait
                projectsQuery.reload();
              }
            });
          }}
        />
      </PanelButtons>
    </Panel>
  );
};

function useOpenFolderAction(filePath: string): ActionDef {
  const mainIpc = useMainIpc();
  return {
    label: 'Open Folder',
    icon: 'faFolderOpen',
    key: 'openFolder',
    tooltip: 'Open project folder',
    action: () => {
      return mainIpc.openDirInExplorer(filePath);
    },
  };
}

const OverviewPage = ({ projectsByType, actionsNode }: NavigationDeps) => {
  const totalProjects = sumBy(objectEntries(projectsByType), ([, it]) =>
    E.isLeft(it) ? 0 : it.right.length
  );
  const { projectManagerFolders } = useAppReactiveNodes();
  const openFolderAction = useOpenFolderAction(projectManagerFolders.root);
  useAddActions(actionsNode, (actions) => {
    actions.push(openFolderAction);
  });

  return (
    <>
      <h2>Total projects: {totalProjects}</h2>
    </>
  );
};

const SpecificPage = ({
  projectsByType,
  type,
  actionsNode,
}: NavigationDeps & { type: FileType }) => {
  const { projectManagerFolders } = useAppReactiveNodes();
  const openFolderAction = useOpenFolderAction(
    projectManagerFolders.byType[type]
  );
  useAddActions(actionsNode, (actions) => {
    actions.push(openFolderAction);
  });
  return (
    <>
      <h2>{type} projects</h2>
      {renderResult(projectsByType[type], (projects) => {
        return (
          <>
            {projects.map((it) => {
              return <ProjectResult key={it.id.name} result={it} />;
            })}
          </>
        );
      })}
    </>
  );
};

const ProjectResult = ({ result }: { result: ProjectResult }) => {
  return (
    <div className={style.fileInfo}>
      <div className={style.infoRow}>
        <div className={style.projectName}>{result.id.name}</div>
        {renderResult(result.info, (inf) => {
          return (
            <>
              <div className={style.currentName}>{inf.current.name}</div>
              <div className={style.originalName}>
                {inf.original?.name ?? '<None>'}
              </div>
              <div className={style.backups}>{inf.backups.length}</div>
            </>
          );
        })}
      </div>
    </div>
  );
};
