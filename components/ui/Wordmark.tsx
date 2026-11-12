// Placeholder wordmark. Replace with the official Nurun logo SVG when available
// (drop it into /public/brand/nurun.svg and swap this component for an <img>).
export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      nurun<i aria-hidden="true" />
    </span>
  );
}
