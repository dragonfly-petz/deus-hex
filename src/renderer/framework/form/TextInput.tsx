import { ReactiveNode } from '../../reactive-state/reactive-node';
import style from './TextInput.module.scss';
import { useReactiveNode } from '../../reactive-state/reactive-hooks';

export const TextInput = ({
  valueNode,
}: {
  valueNode: ReactiveNode<string>;
}) => {
  const currentVal = useReactiveNode(valueNode);

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
