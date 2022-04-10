import { toHex } from '../../common/number';

export const renderId = (id: number) => {
  return (
    <>
      {id} ({toHex(id, 0)})
    </>
  );
};
