import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useAppReactiveNodes } from '../context/context';
import { uuidV4 } from '../../common/uuid';
import { useReactiveNode } from '../reactive-state/reactive-hooks';
import { sortByNumeric } from '../../common/array';
import style from './FlashMessage.module.scss';
import { classNames } from '../../common/react';
import { renderLineBreaks } from './render';
import { StyleVars, toStyle } from './style-var';

const flashMessageKinds = ['info', 'warn', 'error', 'success'] as const;
export type FlashMessageKind = typeof flashMessageKinds[number];

export class FlashMessage {
  public readonly id = uuidV4();

  public readonly created = new Date();

  constructor(
    public readonly kind: FlashMessageKind,
    public readonly title: string,
    public readonly message: string
  ) {}
}

const styleKeys = ['fmColor'] as const;

const kindStyles: Record<
  FlashMessageKind,
  StyleVars<typeof styleKeys[number]>
> = {
  info: { fmColor: 'blue' },
  warn: { fmColor: 'orange' },
  error: { fmColor: 'red' },
  success: { fmColor: 'green' },
};

export const FlashMessages = () => {
  const flashMessagesNode = useAppReactiveNodes().flashMessages;
  const messages = Array.from(useReactiveNode(flashMessagesNode).values());
  sortByNumeric(messages, (it) => it.created.getTime());

  return (
    <div className={style.flashMessages}>
      {messages.map((message) => (
        <div
          style={toStyle(kindStyles[message.kind])}
          className={classNames(style.message)}
        >
          <FontAwesomeIcon icon={faTimes} />
          <div className={style.title}>{message.title}</div>
          <div className={style.body}>{renderLineBreaks(message.message)}</div>
        </div>
      ))}
    </div>
  );
};
