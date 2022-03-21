import style from './Button.module.scss';

export const Button = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => {
  return (
    <button className={style.main} onClick={onClick} type="button">
      {label}
    </button>
  );
};
