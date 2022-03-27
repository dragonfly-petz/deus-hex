import { ReactiveNode } from '../../../common/reactive/reactive-node';
import style from './TextInput.module.scss';
import { useReactiveVal } from '../../reactive-state/reactive-hooks';

export const TextInput = ({
  valueNode,
}: {
  valueNode: ReactiveNode<string>;
}) => {
  const currentVal = useReactiveVal(valueNode);

  return (
    <input
      type="text"
      value={currentVal}
      className={style.input}
      onChange={(e) => {
        valueNode.setValue(e.target.value);
      }}
    />
  );
};
