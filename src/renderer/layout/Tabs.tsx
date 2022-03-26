import { FunctionalComponent } from '../framework/render';
import { BreedClothingTransform } from '../page/BreedClothingTransform';
import style from './layout.module.scss';
import { useAppReactiveNodes } from '../context/context';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { ClothingRename } from '../page/ClothingRename';
import { TabName, tabNames } from './tab-names';
import { Button } from '../framework/Button';

export interface TabDef {
  tabName: string;
  TabContent: FunctionalComponent;
  TabLeftBar?: FunctionalComponent;
  TabRightBar?: FunctionalComponent;
}

export const tabs: Record<TabName, TabDef> = {
  breedClothingTransform: {
    tabName: 'Breed -> Clothing',
    TabContent: BreedClothingTransform,
  },
  clothingRename: {
    tabName: 'Clothing rename',
    TabContent: ClothingRename,
  },
};

export const Tabs = () => {
  const { currentTabNode } = useAppReactiveNodes();
  const currentTab = useReactiveVal(currentTabNode);

  return (
    <div className={style.tabs}>
      {tabNames.map((tabName) => {
        const def = tabs[tabName];
        return (
          <Button
            key={tabName}
            label={def.tabName}
            active={tabName === currentTab}
            onClick={() => {
              currentTabNode.setValue(tabName);
            }}
            size="large"
          />
        );
      })}
    </div>
  );
};
