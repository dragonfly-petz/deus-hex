import { useAppReactiveNodes } from '../context/context';
import { uuidV4 } from '../../common/uuid';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { sortByNumeric } from '../../common/array';
import style from './FlashMessage.module.scss';
import { classNames } from '../../common/react';
import { renderLineBreaks } from './render';
import { globalSh } from './global-style-var';

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

const kindStyles = globalSh.toRecordProxy({
  info: { fmBgColor: 'infoBgColor' },
  warn: { fmBgColor: 'warnBgColor' },
  error: { fmBgColor: 'errorBgColor' },
  success: { fmBgColor: 'successBgColor' },
});

export const FlashMessages = () => {
  const { flashMessagesNode } = useAppReactiveNodes();
  const messages = Array.from(useReactiveVal(flashMessagesNode).values());
  sortByNumeric(messages, (it) => it.created.getTime());

  return (
    <div className={style.flashMessages}>
      {messages.map((message) => (
        <div
          key={message.id}
          style={kindStyles[message.kind]}
          className={classNames(style.message)}
        >
          <div className={style.title}>{message.title}</div>
          <div className={style.body}>{renderLineBreaks(message.message)}</div>
        </div>
      ))}
    </div>
  );
};
