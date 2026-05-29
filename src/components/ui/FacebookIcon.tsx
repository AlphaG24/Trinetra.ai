interface FacebookIconProps {
  className?: string;
  size?: number;
}

export function FacebookIcon({ className, size = 18 }: FacebookIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M13.5 22v-8.2h2.8l.42-3.3H13.5V8.39c0-.95.26-1.6 1.62-1.6h1.73V3.84c-.3-.04-1.33-.12-2.53-.12-2.5 0-4.2 1.52-4.2 4.32v2.41H7.35v3.3h2.82V22h3.33Z" />
    </svg>
  );
}
