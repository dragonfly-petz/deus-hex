import { partialCall } from '../common/function';

function add(a: number, b: number) {
  return a + b;
}

describe('function', () => {
  test('partial call', () => {
    expect(partialCall(add, 1)(2)).toEqual(add(1, 2));
  });
});
