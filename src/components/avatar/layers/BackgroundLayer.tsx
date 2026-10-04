import React from 'react';
import { G, Rect, Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
import type { Category, HealthState } from '../../../domain/types.ts';

interface Props {
  category: Category;
  healthState: HealthState;
}

export const BackgroundLayer: React.FC<Props> = ({ category, healthState }) => {
  const isHealthy = healthState === 'thriving' || healthState === 'good';
  const isStruggling = healthState === 'struggling' || healthState === 'dying';

  // Base backdrop circle
  return (
    <G>
      <Defs>
        <RadialGradient id="bgGlowHealthy" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
          <Stop offset="80%" stopColor="#BAE6FD" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.1" />
        </RadialGradient>
        <RadialGradient id="bgGlowSad" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#F1F5F9" stopOpacity="0.9" />
          <Stop offset="80%" stopColor="#CBD5E1" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#94A3B8" stopOpacity="0.2" />
        </RadialGradient>
      </Defs>

      {/* Main circular frame */}
      <Circle
        cx="256"
        cy="256"
        r="240"
        fill={isHealthy ? 'url(#bgGlowHealthy)' : 'url(#bgGlowSad)'}
      />

      {/* Category-specific backdrop details */}
      {category === 'fitness' && isHealthy && (
        <G opacity="0.3">
          <Circle cx="256" cy="256" r="210" stroke="#0284C7" strokeWidth="6" strokeDasharray="16 12" fill="none" />
          <Path d="M 120 440 L 392 440" stroke="#0369A1" strokeWidth="8" strokeLinecap="round" />
        </G>
      )}

      {category === 'fitness' && isStruggling && (
        <G opacity="0.35">
          {/* Couch silhouette */}
          <Path d="M 140 450 L 372 450 Q 380 430 360 400 L 152 400 Q 132 430 140 450 Z" fill="#64748B" />
        </G>
      )}

      {category === 'finance' && isHealthy && (
        <G opacity="0.25">
          <Circle cx="120" cy="140" r="24" fill="#EAB308" />
          <Circle cx="390" cy="160" r="18" fill="#EAB308" />
          <Circle cx="370" cy="380" r="28" fill="#EAB308" />
          <Path d="M 80 440 Q 256 460 432 440" stroke="#CA8A04" strokeWidth="6" fill="none" />
        </G>
      )}

      {category === 'finance' && isStruggling && (
        <G opacity="0.3">
          {/* Spiderweb in top-right */}
          <Path d="M 430 70 L 496 70 M 496 70 L 496 136 M 460 70 L 496 106 M 480 70 L 496 86" stroke="#94A3B8" strokeWidth="3" />
        </G>
      )}

      {category === 'learning' && isHealthy && (
        <G opacity="0.25">
          {/* Bookshelf arch */}
          <Path d="M 90 440 L 90 220 Q 256 120 422 220 L 422 440" stroke="#6366F1" strokeWidth="6" fill="none" />
        </G>
      )}

      {category === 'learning' && isStruggling && (
        <G opacity="0.3">
          {/* Dim candlestick */}
          <Rect x="400" y="380" width="16" height="50" rx="3" fill="#94A3B8" />
          <Circle cx="408" cy="370" r="6" fill="#F59E0B" opacity="0.5" />
        </G>
      )}

      {category === 'creative' && isHealthy && (
        <G opacity="0.3">
          {/* Splashes */}
          <Circle cx="120" cy="130" r="22" fill="#EC4899" />
          <Circle cx="400" cy="140" r="28" fill="#8B5CF6" />
          <Circle cx="100" cy="360" r="18" fill="#F59E0B" />
          <Circle cx="410" cy="370" r="20" fill="#10B981" />
        </G>
      )}

      {category === 'creative' && isStruggling && (
        <G opacity="0.25">
          {/* Gray ink pool */}
          <Path d="M 160 450 Q 256 465 352 450 Q 256 435 160 450 Z" fill="#64748B" />
        </G>
      )}
    </G>
  );
};
