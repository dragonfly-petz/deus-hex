import { ReactiveNode } from '../../../common/reactive/reactive-node';
import style from './TextArea.module.scss';
import { useReactiveVal } from '../../reactive-state/reactive-hooks';
import { classNames } from '../../../common/react';

export const TextArea = ({
  valueNode,
  className,
}: {
  valueNode: ReactiveNode<string>;
  className?: string;
}) => {
  const currentVal = useReactiveVal(valueNode);

  return (
    <textarea
      value={currentVal}
      className={classNames(style.textArea, className)}
      onChange={(e) => {
        valueNode.setValue(e.target.value);
      }}
    />
  );
};
