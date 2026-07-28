import type { ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="f">
      <span>{label}</span>
      {children}
    </label>
  );
}
