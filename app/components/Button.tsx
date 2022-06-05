import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';
import { className } from '~/lib/util';

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  size?: 'small' | 'normal' | 'large';
  label: string;
  children?: never;
};

export default function Button(props: ButtonProps) {
  const { className: extraClass, label, size, ...buttonProps } = props;
  return (
    <button
      className={className(
        'Button',
        {
          'Button-large': size === 'large',
          'Button-small': size === 'small',
        },
        extraClass
      )}
      {...buttonProps}
    >
      {label}
    </button>
  );
}
