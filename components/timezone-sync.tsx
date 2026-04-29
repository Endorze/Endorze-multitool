'use client';

import { useEffect } from 'react';

export function TimezoneSync() {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch('/api/user/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeZone }),
    }).catch(() => undefined);
  }, []);

  return null;
}
