import { ReactiveNode } from '../../../common/reactive/reactive-node';
import style from './TextArea.module.scss';
import { useReactiveVal } from '../../reactive-state/reactive-hooks';

export const TextArea = ({
  valueNode,
}: {
  valueNode: ReactiveNode<string>;
}) => {
  const currentVal = useReactiveVal(valueNode);

  return (
    <textarea
      value={currentVal}
      className={style.textArea}
      onChange={(e) => {
        valueNode.setValue(e.target.value);
      }}
    />
  );
};
