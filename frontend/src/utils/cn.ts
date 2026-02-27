/** Joins class names, filtering out falsy values. Tiny alternative to clsx. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
