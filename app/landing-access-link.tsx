'use client';

import type { MouseEvent, ReactNode } from 'react';

export default function LandingAccessLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  function openLogin(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    window.location.assign('/acervo');
  }

  return (
    <a className={className} href="/acervo" target="_self" onClick={openLogin}>
      {children}
    </a>
  );
}
