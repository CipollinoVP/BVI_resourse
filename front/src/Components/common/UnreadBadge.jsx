import React from 'react';
import { cn } from './utils';

// Красный счётчик непрочитанных сообщений. При нуле ничего не рисует.
const UnreadBadge = ({ count, className }) => {
  if (!count || count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white',
        className
      )}
      title={`Непрочитанных сообщений: ${count}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default UnreadBadge;
