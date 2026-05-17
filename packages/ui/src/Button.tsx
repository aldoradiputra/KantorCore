import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children?: ReactNode
}

const sizeStyles: Record<Size, CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 13 },
  md: { height: 40, padding: '0 16px', fontSize: 14 },
  lg: { height: 48, padding: '0 20px', fontSize: 14 },
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    background: 'var(--indigo)',
    color: 'var(--white)',
    border: '1px solid var(--indigo)',
  },
  secondary: {
    background: 'var(--surface)',
    color: 'var(--fg-1)',
    border: '1px solid var(--border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--fg-2)',
    border: '1px solid transparent',
  },
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 'var(--r-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    lineHeight: 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'background var(--d-fast) var(--ease), transform var(--d-instant) var(--ease)',
    width: fullWidth ? '100%' : undefined,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  }

  return (
    <button {...rest} disabled={disabled} style={base}>
      {children}
    </button>
  )
}
