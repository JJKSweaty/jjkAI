'use client';

import { AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: 'note' | 'tip' | 'warning';
  title?: string;
  children: React.ReactNode;
}) {
  const config = {
    note: { icon: Info, bg: 'bg-muted', border: 'border-border' },
    tip: { icon: CheckCircle2, bg: 'bg-emerald-950/30', border: 'border-emerald-900/40' },
    warning: { icon: AlertCircle, bg: 'bg-amber-950/30', border: 'border-amber-900/40' },
  }[type];

  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-3 flex gap-3 my-3`}>
      <Icon className="h-4 w-4 mt-0.5 opacity-80" />
      <div>
        {title && <div className="text-sm font-medium mb-1">{title}</div>}
        <div className="text-[0.95rem] leading-6">{children}</div>
      </div>
    </div>
  );
}
