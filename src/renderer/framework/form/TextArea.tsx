import { ReactiveNode } from '../../reactive-state/reactive-node';
import style from './TextArea.module.scss';
import { useReactiveNode } from '../../reactive-state/reactive-hooks';

export const TextArea = ({
  valueNode,
}: {
  valueNode: ReactiveNode<string>;
}) => {
  const currentVal = useReactiveNode(valueNode);

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
