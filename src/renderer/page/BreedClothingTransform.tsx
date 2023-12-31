import { Either } from 'fp-ts/Either';
import style from './BreedClothingTransform.module.scss';
import { Button } from '../framework/Button';
import { nullable } from '../../common/null';
import { throwRejectionK } from '../../common/promise';
import { useMainIpc } from '../context/context';
import { isDev } from '../../main/app/util';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import { E } from '../../common/fp-ts/fp';
import { TextArea } from '../framework/form/TextArea';
import { renderResult } from '../framework/result';

export function BreedClothingTransform() {
  const mainIpc = useMainIpc();
  return (
    <div className={style.main}>
      <div className={style.col}>
        <h2>Add balls</h2>
        <TransformText
          doTransform={(it) => mainIpc.breedAddBallsToClothing(it)}
          defaultVal={isDev() ? debugAddballz : ''}
        />
      </div>
      <div className={style.col}>
        <h2>Linez</h2>
        <TransformText
          doTransform={(it) => mainIpc.breedLinesToClothing(it)}
          defaultVal={isDev() ? debugLinez : ''}
        />
      </div>
    </div>
  );
}

function TransformText({
  doTransform,
  defaultVal,
}: {
  doTransform: (val: string) => Promise<E.Either<string, string>>;
  defaultVal?: string;
}) {
  const textNode = useMkReactiveNodeMemo(defaultVal ?? '');
  const resultNode = useMkReactiveNodeMemo(nullable<Either<string, string>>());
  const result = useReactiveVal(resultNode);
  return (
    <>
      <TextArea valueNode={textNode} />
      <div className={style.buttons}>
        <Button
          label="Transform"
          onClick={() => {
            throwRejectionK(async () => {
              resultNode.setValue(await doTransform(textNode.getValue()));
            });
          }}
        />
        <Button
          label="Reset"
          onClick={() => {
            textNode.setValue('');
            resultNode.setValue(null);
          }}
        />
      </div>
      {renderResult(result, (output) => {
        return (
          <div className={style.result}>
            <textarea value={output} readOnly />
          </div>
        );
      })}
    </>
  );
}
const debugAddballz =
  '37,\t0,\t-5,\t-14,\t39,\t244,\t244,\t4,\t-1,\t-1,\t12,\t0,\t0,\t2\n' +
  '37,\t0,\t-1,\t-19,\t54,\t244,\t244,\t0,\t-1,\t-1,\t8,\t0,\t0,\t7\n' +
  '37,\t0,\t5,\t-23,\t54,\t244,\t244,\t0,\t-1,\t-1,\t7,\t0,\t0,\t7\n' +
  '37,\t0,\t12,\t-25,\t54,\t244,\t244,\t0,\t-1,\t-1,\t5,\t0,\t0,\t7\n' +
  '37,\t0,\t-12,\t-8,\t50,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  ';eyes             97-98\n' +
  '37,\t4,\t-14,\t-6,\t244,\t244,\t244,\t0,\t-1,\t-1,\t7,\t0,\t0,\t2\n' +
  '37,\t-4,\t-14,\t12,\t244,\t244,\t244,\t0,\t-1,\t-1,\t7,\t0,\t0,\t2\n' +
  ';left wing         99- 113\n' +
  '37,\t6,\t-10,\t-14,\t26,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t5\n' +
  '37,\t5,\t-8,\t-16,\t20,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t6\n' +
  '37,\t12,\t5,\t-43,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t7,\t2,\t-33,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t18,\t-14,\t-35,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t20,\t-9,\t-40,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t12,\t-29,\t-10,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t23,\t-50,\t-11,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t16,\t-18,\t-29,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t19,\t-30,\t-31,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t17,\t-1,\t-45,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t22,\t-35,\t-28,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t13,\t4,\t-44,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t23,\t-39,\t-25,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t24,\t-43,\t-18,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  ';right wing      114-  128\n' +
  '37,\t-6,\t-10,\t-14,\t26,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t5\n' +
  '37,\t-5,\t-8,\t-16,\t20,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t6\n' +
  '37,\t-12,\t5,\t-43,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-7,\t2,\t-33,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-18,\t-14,\t-35,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-20,\t-9,\t-40,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-12,\t-29,\t-10,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-23,\t-50,\t-11,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-16,\t-18,\t-29,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-19,\t-30,\t-31,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-17,\t-1,\t-45,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-22,\t-35,\t-28,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-13,\t4,\t-44,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-23,\t-39,\t-25,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2\n' +
  '37,\t-24,\t-43,\t-18,\t244,\t244,\t244,\t0,\t-1,\t-1,\t11,\t0,\t0,\t2 ';

const debugLinez =
  '95,\t94,\t0,\t-1,\t-1,\t-1,\t100,\t100\n' +
  '94,\t93,\t0,\t-1,\t-1,\t-1,\t100,\t100\n' +
  ';left wing\n' +
  '100,\t102,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '102,\t101,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '100,\t111,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '100,\t109,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '100,\t104,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '100,\t103,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '107,\t99,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  '99,\t105,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  '105,\t106,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '99,\t108,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  '99,\t110,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  '99,\t112,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  '99,\t113,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  '106,\t113,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '113,\t112,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '112,\t110,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '110,\t108,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '108,\t107,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '101,\t111,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '111,\t109,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '109,\t104,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '104,\t103,\t0,\t-1,\t-1,\t-1,\t110,\t110,  1,  1\n' +
  '99,\t106,\t0,\t-1,\t-1,\t-1,\t110,\t 110,  1,  1\n' +
  ';right wing\n' +
  '115,\t117,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '117,\t116,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '115,\t126,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '115,\t124,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '115,\t119,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '115,\t118,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '122,\t114,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '114,\t120,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '120,\t121,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '114,\t123,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '114,\t125,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '114,\t127,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '114,\t128,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '121,\t128,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '128,\t127,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '127,\t125,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '125,\t123,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '123,\t122,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '116,\t126,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '126,\t124,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '124,\t119,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '119,\t118,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1\n' +
  '114,\t121,\t0,\t-1,\t-1,\t-1,\t110,\t110,   1,  1';
