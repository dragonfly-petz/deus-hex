import { render } from 'react-dom';
import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import {
  BallInfo,
  toArrayWithParents,
} from '../../common/petz/parser/line/ball-helper';
import style from './CodeMirror.module.scss';
import { BallLabelData } from '../../common/petz/parser/line/ball-labels';
import { classNames } from '../../common/react';
import { isNotNully } from '../../common/null';

type JumpToLine = (l: number) => void;

export function createBallRefTooltip(
  info: BallInfo,
  labelData: BallLabelData,
  jumpToLine: JumpToLine,
  omissions: Set<number>
) {
  const tooltipNode = document.createElement('div');
  render(
    <BallRefTooltip
      info={info}
      labelData={labelData}
      jumpToLine={jumpToLine}
      omissions={omissions}
    />,
    tooltipNode
  );
  return tooltipNode;
}

function BallRefTooltip({
  info,
  labelData,
  jumpToLine,
  omissions,
}: {
  info: BallInfo;
  labelData: BallLabelData;
  jumpToLine: JumpToLine;
  omissions: Set<number>;
}) {
  const lines = toArrayWithParents(info).reverse();
  const head = lines[0];
  const tail = lines.slice(1);
  return (
    <div className={style.tooltip}>
      <div className={style.tags}>
        <div className={classNames(style.zone, `zone-${labelData.zone}`)}>
          {labelData.zone}
        </div>
      </div>
      <BallRefLine
        info={head}
        first
        labelData={labelData}
        jumpToLine={jumpToLine}
        omissions={omissions}
      />
      {tail.map((it, idx) => {
        return (
          <BallRefLine
            key={idx}
            info={it}
            labelData={labelData}
            jumpToLine={jumpToLine}
            omissions={omissions}
          />
        );
      })}
    </div>
  );
}

function BallRefLine({
  info,
  first = false,
  labelData,
  jumpToLine,
  omissions,
}: {
  info: Either<string, BallInfo>;
  labelData: BallLabelData;
  first?: boolean;
  jumpToLine: JumpToLine;
  omissions: Set<number>;
}) {
  if (E.isLeft(info)) {
    return <div className={style.error}>{info.left}</div>;
  }
  const { line } = info.right;
  return (
    <div
      className={classNames(
        style.line,
        first ? style.first : null,
        line.tag === 'ballzInfo' ? style.baseBall : null
      )}
    >
      {first ? '' : <div className={style.spacer}>{'>'}</div>}
      <button
        onClick={() =>
          isNotNully(line.lineIndex) ? jumpToLine(line.lineIndex + 1) : null
        }
      >
        {line.tag === 'addBall' ? 'Add' : 'Base'}
        {'<'}
        {line.lineContent.ballId ?? 'null'}
        {'>'}
        {line.tag === 'ballzInfo' ? <> {labelData.label}</> : ''}
      </button>
      {isNotNully(line.lineContent.ballId) &&
      omissions.has(line.lineContent.ballId) ? (
        <div className={style.omissionTag}>omitted</div>
      ) : null}
    </div>
  );
}
