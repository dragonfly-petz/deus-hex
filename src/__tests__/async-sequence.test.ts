import { Deferred } from '../common/promise';
import { AsyncSequence } from '../common/async-sequence';

describe('async sequence', () => {
  test('ordering', async () => {
    let called = 0;

    const first = new Deferred();
    const second = new Deferred();
    const third = new Deferred();
    const sequence = new AsyncSequence();
    // noinspection ES6MissingAwait
    sequence.sequence(() => {
      called++;
      return first.promise;
    });
    // noinspection ES6MissingAwait
    sequence.sequence(() => {
      called++;
      return second.promise;
    });
    const finalProm = sequence.sequence(() => {
      called++;
      return third.promise.then(() => called);
    });
    expect(called).toEqual(1);
    first.resolve();
    await first.promise;
    expect(called).toEqual(2);
    second.resolve();
    third.resolve();
    const res = await finalProm;

    expect(called).toEqual(3);
    expect(res).toEqual(3);
  });
});
