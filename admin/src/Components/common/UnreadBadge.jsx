import React from 'react';

// Красный счётчик непрочитанных сообщений. При нуле ничего не рисует.
const UnreadBadge = ({ count, style }) => {
  if (!count || count <= 0) return null;

  return (
    <span
      style={{ ...badgeStyle, ...style }}
      title={`Непрочитанных сообщений: ${count}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '20px',
  height: '20px',
  padding: '0 6px',
  borderRadius: '10px',
  backgroundColor: '#dc3545',
  color: '#fff',
  fontSize: '0.75rem',
  fontWeight: 700,
  lineHeight: 1,
  boxSizing: 'border-box',
  flexShrink: 0,
};

export default UnreadBadge;
