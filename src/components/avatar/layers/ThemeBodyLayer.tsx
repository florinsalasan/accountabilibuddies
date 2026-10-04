import React from 'react';
import { G, Path, Circle, Rect, Ellipse } from 'react-native-svg';
import type { Category, HealthState } from '../../../domain/types.ts';

interface Props {
  category: Category;
  healthState: HealthState;
}

export const ThemeBodyLayer: React.FC<Props> = ({ category, healthState }) => {
  const isThriving = healthState === 'thriving';
  const isHealthy = healthState === 'thriving' || healthState === 'good';
  const isDying = healthState === 'dying';

  if (category === 'fitness') {
    if (isHealthy) {
      return (
        <G>
          {/* Head sweatband */}
          <Path
            d="M 188 175 Q 256 160 324 175"
            stroke="#EF4444"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Athletic chest definition */}
          <Path
            d="M 230 260 Q 256 270 282 260"
            stroke="#1D4ED8"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {isThriving && (
            <Path
              d="M 256 270 L 256 310"
              stroke="#1D4ED8"
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}
        </G>
      );
    } else {
      return (
        <G>
          {/* Slouching body lines and couch potato belly bulge */}
          <Path
            d="M 180 340 Q 256 385 332 340"
            stroke="#334155"
            strokeWidth="4"
            fill="none"
          />
          {isDying && (
            <Path
              d="M 195 375 Q 256 410 317 375"
              stroke="#475569"
              strokeWidth="3"
              fill="none"
            />
          )}
        </G>
      );
    }
  }

  if (category === 'finance') {
    if (isHealthy) {
      return (
        <G>
          {/* Fancy suit lapels & golden tie */}
          <Path d="M 216 260 L 256 330 L 296 260" fill="#1E293B" />
          <Path d="M 256 275 L 262 340 L 256 360 L 250 340 Z" fill="#EAB308" />
          {isThriving && (
            <Circle cx="230" cy="290" r="5" fill="#FACC15" />
          )}
        </G>
      );
    } else {
      return (
        <G>
          {/* Patched clothes & loose stitches */}
          <Rect x="200" y="320" width="30" height="24" rx="4" fill="#64748B" opacity="0.6" />
          <Path d="M 205 325 L 225 339 M 225 325 L 205 339" stroke="#E2E8F0" strokeWidth="2" />
          {/* Empty turned-out pocket */}
          <Path d="M 160 330 Q 145 350 155 365" stroke="#94A3B8" strokeWidth="3" fill="none" />
        </G>
      );
    }
  }

  if (category === 'learning') {
    if (isHealthy) {
      return (
        <G>
          {/* Neat collar & smart glasses */}
          <Path d="M 226 250 L 256 280 L 286 250" fill="#312E81" />
          {/* Glasses frame */}
          <Circle cx="225" cy="205" r="22" stroke="#1E1B4B" strokeWidth="4" fill="#EEF2FF" fillOpacity="0.4" />
          <Circle cx="287" cy="205" r="22" stroke="#1E1B4B" strokeWidth="4" fill="#EEF2FF" fillOpacity="0.4" />
          <Path d="M 247 205 L 265 205" stroke="#1E1B4B" strokeWidth="4" />
        </G>
      );
    } else {
      return (
        <G>
          {/* Crooked, broken taped glasses */}
          <Circle cx="222" cy="215" r="22" stroke="#475569" strokeWidth="4" fill="none" transform="rotate(-10 222 215)" />
          <Circle cx="286" cy="200" r="22" stroke="#475569" strokeWidth="4" fill="none" transform="rotate(8 286 200)" />
          {/* Bandage tape on bridge */}
          <Rect x="246" y="202" width="16" height="8" rx="2" fill="#CBD5E1" transform="rotate(-5 254 206)" />
        </G>
      );
    }
  }

  if (category === 'creative') {
    if (isHealthy) {
      return (
        <G>
          {/* Chic tilted artist beret */}
          <Ellipse cx="210" cy="140" rx="46" ry="18" fill="#BE185D" transform="rotate(-15 210 140)" />
          {/* Paint splatters on apron */}
          <Circle cx="230" cy="320" r="7" fill="#F43F5E" />
          <Circle cx="275" cy="340" r="9" fill="#0EA5E9" />
          <Circle cx="250" cy="365" r="6" fill="#F59E0B" />
        </G>
      );
    } else {
      return (
        <G>
          {/* Drooping faded beret */}
          <Ellipse cx="205" cy="155" rx="38" ry="14" fill="#64748B" transform="rotate(10 205 155)" />
          {/* Gray smudge */}
          <Circle cx="245" cy="335" r="14" fill="#475569" opacity="0.4" />
        </G>
      );
    }
  }

  // Generic category: subtle energy waves or shivering marks
  if (isHealthy) {
    return (
      <G opacity="0.6">
        <Circle cx="160" cy="180" r="4" fill="#FACC15" />
        <Circle cx="350" cy="180" r="5" fill="#FACC15" />
        <Circle cx="256" cy="120" r="6" fill="#FACC15" />
      </G>
    );
  } else {
    return (
      <G opacity="0.6">
        {/* Shivering wavy lines around buddy */}
        <Path d="M 125 240 Q 120 250 125 260" stroke="#94A3B8" strokeWidth="3" fill="none" />
        <Path d="M 387 240 Q 392 250 387 260" stroke="#94A3B8" strokeWidth="3" fill="none" />
      </G>
    );
  }
};
