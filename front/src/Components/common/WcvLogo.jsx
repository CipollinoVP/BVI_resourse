import React from 'react';
import localLogo from '../../../logo_min.png'; // или logo_min.png

export function WvcLogo({ className = 'h-10 w-auto', style = {} }) {
  return (
    <span className={className} style={{ display: 'inline-block', ...style }} data-wvc-role="logo">
      <img
        src={localLogo}
        alt="Logo"
        style={{ display: 'block', height: '100%', width: 'auto' }}
      />
    </span>
  );
}