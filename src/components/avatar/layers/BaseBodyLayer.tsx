import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { HealthState } from '../../../domain/types.ts';

interface Props {
  healthState: HealthState;
}

export const BaseBodyLayer: React.FC<Props> = ({ healthState }) => {
  const isHealthy = healthState === 'thriving' || healthState === 'good';
  const isDying = healthState === 'dying';

  // Body color gradient changes slightly depending on overall vitality
  const topColor = isHealthy ? '#60A5FA' : isDying ? '#94A3B8' : '#64748B';
  const bottomColor = isHealthy ? '#2563EB' : isDying ? '#475569' : '#334155';
  const bellyColor = isHealthy ? '#EFF6FF' : '#E2E8F0';

  return (
    <G>
      <Defs>
        <LinearGradient id="buddyBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={topColor} />
          <Stop offset="100%" stopColor={bottomColor} />
        </LinearGradient>
      </Defs>

      {/* Feet / Paws */}
      <Ellipse cx="206" cy="426" rx="34" ry="18" fill="#1D4ED8" opacity={isDying ? '0.6' : '0.9'} />
      <Ellipse cx="306" cy="426" rx="34" ry="18" fill="#1D4ED8" opacity={isDying ? '0.6' : '0.9'} />

      {/* Little ears / tufts */}
      <Path
        d="M 180 180 Q 150 120 190 140 Z"
        fill={topColor}
      />
      <Path
        d="M 332 180 Q 362 120 322 140 Z"
        fill={topColor}
      />

      {/* Main Body - pear/blob shaped creature */}
      <Path
        d="M 256 140
           C 180 140, 140 200, 140 280
           C 140 370, 170 420, 256 420
           C 342 420, 372 370, 372 280
           C 372 200, 332 140, 256 140 Z"
        fill="url(#buddyBodyGrad)"
      />

      {/* Soft Belly Patch */}
      <Ellipse
        cx="256"
        cy="315"
        rx="78"
        ry="86"
        fill={bellyColor}
      />

      {/* Little arms */}
      <Ellipse
        cx="140"
        cy="300"
        rx="22"
        ry="42"
        transform="rotate(20 140 300)"
        fill={topColor}
      />
      <Ellipse
        cx="372"
        cy="300"
        rx="22"
        ry="42"
        transform="rotate(-20 372 300)"
        fill={topColor}
      />
    </G>
  );
};
