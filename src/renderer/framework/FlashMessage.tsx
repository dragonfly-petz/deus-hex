import { useCallback, useEffect } from 'react';
import { useAppReactiveNodes } from '../context/context';
import { uuidV4 } from '../../common/uuid';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { sortByNumeric } from '../../common/array';
import style from './FlashMessage.module.scss';
import { classNames } from '../../common/react';
import { renderLineBreaks } from './render';
import { globalSh } from './global-style-var';
import { Button } from './Button';

const flashMessageKinds = ['info', 'warn', 'error', 'success'] as const;
export type FlashMessageKind = typeof flashMessageKinds[number];

export interface FlashMessageProps {
  kind: FlashMessageKind;
  title: string;
  message: string;
}

export class FlashMessage {
  public readonly id = uuidV4();

  public readonly created = new Date();

  public readonly kind: FlashMessageKind;

  public readonly title: string;

  public readonly message: string;

  constructor(props: FlashMessageProps) {
    this.kind = props.kind;
    this.title = props.title;
    this.message = props.message;
  }
}

const kindStyles = globalSh.toRecordProxy({
  info: { localVar1: 'infoBgColor' },
  warn: { localVar1: 'warnBgColor' },
  error: { localVar1: 'errorBgColor' },
  success: { localVar1: 'successBgColor' },
});

export const FlashMessages = () => {
  const { flashMessagesNode } = useAppReactiveNodes();
  const messages = Array.from(useReactiveVal(flashMessagesNode).values());
  sortByNumeric(messages, (it) => it.created.getTime());

  return (
    <div className={style.flashMessages}>
      {messages.map((message) => (
        <FlashMessageC key={message.id} message={message} />
      ))}
    </div>
  );
};

const FlashMessageC = ({ message }: { message: FlashMessage }) => {
  const { flashMessagesNode } = useAppReactiveNodes();
  const clearMessage = useCallback(() => {
    flashMessagesNode.setValueFn((it) => {
      it.delete(message.id);
      return it;
    });
  }, [flashMessagesNode, message]);
  useEffect(() => {
    const val = setTimeout(clearMessage, 10e3);
    return () => clearTimeout(val);
  }, [clearMessage]);
  return (
    <div style={kindStyles[message.kind]} className={classNames(style.message)}>
      <div className={style.button}>
        <Button icon="faTimes" onClick={clearMessage} />
      </div>

      <div className={style.title}>{message.title}</div>
      <div className={style.body}>{renderLineBreaks(message.message)}</div>
    </div>
  );
};
