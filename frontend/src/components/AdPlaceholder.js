import React from 'react';
import { useAuth } from '../AuthContext';

export const AdPlaceholder = ({ position = 'banner' }) => {
  const { user } = useAuth();

  // Don't show ads for premium users
  if (user?.subscription_status === 'premium') {
    return null;
  }

  const sizes = {
    banner: 'h-24',
    sidebar: 'h-64',
    large: 'h-96'
  };

  return (
    <div 
      className={`ad-placeholder ${sizes[position]}`}
      data-testid={`ad-placeholder-${position}`}
    >
      <div className="text-xs uppercase tracking-wide mb-2">Patrocinado</div>
      <div className="font-semibold">Espaço para anúncio</div>
      <div className="text-xs mt-1">(Google AdSense)</div>
    </div>
  );
};