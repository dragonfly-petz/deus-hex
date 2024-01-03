import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { BallzInfoContentLine } from './ballz-info';
import { AddBallContentLine } from './add-ball';
import { safeGet } from '../../../array';
import { isNully } from '../../../null';
import { getOrPut } from '../../../map';

export type BallContentLine = BallzInfoContentLine | AddBallContentLine;

export interface BallzInfo {
  ballzArray: Array<BallContentLine>;
  ballInfoMap: Map<number, Either<string, BallInfo>>;
}

export interface BallInfo {
  ultimateParent: Either<string, BallInfo | null>;
  line: BallContentLine;
  parent: Either<string, BallInfo | null>;
}

export function getBaseBallId(info: BallInfo): Either<string, number> {
  if (info.line.tag === 'ballzInfo') {
    if (isNully(info.line.lineContent.ballId)) {
      return E.left('Missing "ballId" on base ball');
    }
    return E.of(info.line.lineContent.ballId);
  }
  return pipe(
    info.ultimateParent,
    E.chain((it) => {
      if (isNully(it)) {
        console.log(info);
        return E.left(
          'addball with no ultimate parent - Should be impossible!'
        );
      }
      return getBaseBallId(it);
    })
  );
}

export function getBallInfo(
  id: number,
  ballz: BallzInfo
): Either<string, BallInfo> {
  return getOrPut(ballz.ballInfoMap, id, () => {
    const line = safeGet(ballz.ballzArray, id);
    if (isNully(line)) {
      return E.left(`Couldn\`t find ball with id ${id}`);
    }
    if (line.tag === 'addBall') {
      const parent = getBallInfo(line.lineContent.ballRef, ballz);
      return E.of({
        line,
        parent,
        ultimateParent: pipe(
          parent,
          E.chain((it) => it.ultimateParent)
        ),
      });
    }
    const baseBall: BallInfo = {
      line,
      parent: E.of(null),
      ultimateParent: E.of(null),
    };
    baseBall.ultimateParent = E.of(baseBall);
    return E.of(baseBall);
  });
}
