import { MutableRefObject, RefObject, useCallback, useRef } from 'react';
import { isNotNully, isNully } from '../../common/null';

export interface MountUnmountRef<A, B> {
  refSetter: (element: A | null) => void;
  resultRef: RefObject<B | null>;
}

export function useMemoRef<A, B>(
  setup: (a: A) => [B, () => void]
): MountUnmountRef<A, B> {
  const resAndDisposerRef: MutableRefObject<[B, () => void] | null> =
    useRef(null);
  const resultRef: MutableRefObject<B | null> = useRef(null);

  const refSetter = useCallback((ref: A | null) => {
    if (isNotNully(ref)) {
      if (isNully(resAndDisposerRef.current)) {
        resAndDisposerRef.current = setup(ref);
        [resultRef.current] = resAndDisposerRef.current;
      }
    } else if (isNotNully(resAndDisposerRef.current)) {
      resAndDisposerRef.current[1]();
      resAndDisposerRef.current = null;
      resultRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    refSetter,
    resultRef,
  };
}
