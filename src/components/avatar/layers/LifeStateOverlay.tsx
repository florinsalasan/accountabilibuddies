import React from 'react';
import { G, Path, Circle, Rect, Ellipse, Polygon, Text as SvgText } from 'react-native-svg';
import type { LifeState } from '../../../domain/types.ts';

interface Props {
  lifeState?: LifeState;
}

export const LifeStateOverlay: React.FC<Props> = ({ lifeState }) => {
  if (!lifeState || lifeState === 'active') {
    return null;
  }

  if (lifeState === 'paused') {
    return (
      <G>
        {/* Cute striped sleeping nightcap on buddy's head */}
        <Path
          d="M 190 170 Q 240 100 320 80 Q 290 120 280 160 Z"
          fill="#3B82F6"
        />
        <Path
          d="M 220 145 L 245 125 M 255 120 L 280 100"
          stroke="#FFFFFF"
          strokeWidth="10"
        />
        {/* Pompom at tip */}
        <Circle cx="324" cy="80" r="14" fill="#FFFFFF" />

        {/* Sleeping eyes closed in peace (u_u) */}
        <Path
          d="M 205 212 Q 215 224 225 212"
          stroke="#1E293B"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 287 212 Q 297 224 307 212"
          stroke="#1E293B"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Floating Z z z letters */}
        <SvgText x="320" y="170" fill="#60A5FA" fontSize="32" fontWeight="bold">Z</SvgText>
        <SvgText x="345" y="140" fill="#93C5FD" fontSize="24" fontWeight="bold">z</SvgText>
        <SvgText x="365" y="115" fill="#BFDBFE" fontSize="18" fontWeight="bold">z</SvgText>
      </G>
    );
  }

  if (lifeState === 'completed') {
    return (
      <G>
        {/* Golden Royal Crown */}
        <Path
          d="M 210 135 L 215 90 L 235 115 L 256 80 L 277 115 L 297 90 L 302 135 Z"
          fill="#FACC15"
          stroke="#CA8A04"
          strokeWidth="4"
        />
        <Circle cx="215" cy="88" r="5" fill="#EF4444" />
        <Circle cx="256" cy="78" r="6" fill="#3B82F6" />
        <Circle cx="297" cy="88" r="5" fill="#10B981" />

        {/* Colorful Confetti drifting */}
        <Rect x="130" y="120" width="12" height="6" fill="#F43F5E" transform="rotate(25 130 120)" />
        <Rect x="380" y="130" width="12" height="6" fill="#3B82F6" transform="rotate(-30 380 130)" />
        <Rect x="150" y="240" width="10" height="5" fill="#10B981" transform="rotate(45 150 240)" />
        <Rect x="360" y="260" width="10" height="5" fill="#F59E0B" transform="rotate(-15 360 260)" />
        <Circle cx="120" cy="180" r="5" fill="#A855F7" />
        <Circle cx="390" cy="200" r="6" fill="#EC4899" />
      </G>
    );
  }

  if (lifeState === 'lastChance') {
    return (
      <G>
        {/* Emergency Flashing Siren on head */}
        <Rect x="242" y="105" width="28" height="35" rx="6" fill="#DC2626" />
        <Rect x="238" y="136" width="36" height="8" rx="2" fill="#1E293B" />
        {/* Beacon glow rings */}
        <Path d="M 225 105 Q 215 115 215 125" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" fill="none" />
        <Path d="M 287 105 Q 297 115 297 125" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Hazard Alert Badge */}
        <Rect x="130" y="440" width="252" height="34" rx="17" fill="#FEF08A" stroke="#CA8A04" strokeWidth="3" />
        {/* Warning triangle icon */}
        <Polygon points="160,448 171,466 149,466" fill="#B45309" />
        <Rect x="159" y="453" width="2" height="6" fill="#FEF08A" rx="1" />
        <Circle cx="160" cy="463" r="1.2" fill="#FEF08A" />
        <SvgText x="262" y="463" fill="#854D0E" fontSize="16" fontWeight="bold" textAnchor="middle">
          LAST CHANCE!
        </SvgText>
      </G>
    );
  }

  if (lifeState === 'dead') {
    return (
      <G>
        {/* Stone Tombstone behind */}
        <Path
          d="M 180 430 L 180 280 Q 256 220 332 280 L 332 430 Z"
          fill="#475569"
          stroke="#334155"
          strokeWidth="4"
        />
        <SvgText x="256" y="325" fill="#94A3B8" fontSize="28" fontWeight="bold" textAnchor="middle">
          R. I. P.
        </SvgText>
        <SvgText x="256" y="365" fill="#CBD5E1" fontSize="15" textAnchor="middle">
          Gave their best
        </SvgText>

        {/* Translucent little ghost buddy floating upwards with halo */}
        <G transform="translate(0, -60)" opacity="0.85">
          <Ellipse cx="256" cy="120" rx="36" ry="12" stroke="#FACC15" strokeWidth="5" fill="none" />
          {/* Ghost body tail */}
          <Path
            d="M 220 220 Q 256 250 292 220 Q 274 200 256 210 Q 238 200 220 220 Z"
            fill="#FFFFFF"
            opacity="0.7"
          />
        </G>
      </G>
    );
  }

  return null;
};
