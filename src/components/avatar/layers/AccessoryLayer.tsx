import React from 'react';
import { G, Path, Circle, Rect, Ellipse } from 'react-native-svg';
import type { Category, HealthState } from '../../../domain/types.ts';

interface Props {
  category: Category;
  healthState: HealthState;
}

export const AccessoryLayer: React.FC<Props> = ({ category, healthState }) => {
  const isHealthy = healthState === 'thriving' || healthState === 'good';

  if (category === 'fitness') {
    if (isHealthy) {
      return (
        <G>
          {/* Barbell held or placed alongside */}
          <Rect x="360" y="270" width="10" height="90" rx="3" fill="#64748B" />
          <Rect x="350" y="275" width="30" height="12" rx="3" fill="#1E293B" />
          <Rect x="350" y="340" width="30" height="12" rx="3" fill="#1E293B" />
        </G>
      );
    } else {
      return (
        <G>
          {/* TV Remote on the floor */}
          <Rect x="350" y="360" width="22" height="42" rx="4" fill="#334155" transform="rotate(15 350 360)" />
          <Circle cx="357" cy="370" r="2.5" fill="#EF4444" />
          <Circle cx="363" cy="370" r="2.5" fill="#10B981" />
          {/* Potato chips bag */}
          <Path d="M 125 365 L 148 355 L 155 390 L 132 400 Z" fill="#F59E0B" />
        </G>
      );
    }
  }

  if (category === 'finance') {
    if (isHealthy) {
      return (
        <G>
          {/* Golden bag of coins */}
          <Path
            d="M 345 350 Q 365 330 375 350 Q 395 385 375 410 Q 345 415 335 385 Z"
            fill="#EAB308"
          />
          <Path d="M 355 340 L 370 340" stroke="#CA8A04" strokeWidth="4" />
          {/* Coin sparkle */}
          <Circle cx="360" cy="375" r="4" fill="#FEF08A" />
        </G>
      );
    } else {
      return (
        <G>
          {/* Empty overturned broken piggy bank */}
          <Ellipse cx="360" cy="390" rx="20" ry="14" fill="#FDA4AF" transform="rotate(-30 360 390)" />
          <Path d="M 355 385 L 365 395" stroke="#E11D48" strokeWidth="2" />
        </G>
      );
    }
  }

  if (category === 'learning') {
    if (isHealthy) {
      return (
        <G>
          {/* Open glowing book */}
          <Path d="M 330 360 Q 355 345 380 360 L 380 395 Q 355 380 330 395 Z" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="3" />
          <Path d="M 355 352 L 355 387" stroke="#4F46E5" strokeWidth="3" />
        </G>
      );
    } else {
      return (
        <G>
          {/* Stack of dusty unread books */}
          <Rect x="340" y="380" width="46" height="12" rx="2" fill="#64748B" />
          <Rect x="344" y="366" width="42" height="12" rx="2" fill="#475569" />
          <Rect x="348" y="352" width="38" height="12" rx="2" fill="#334155" />
        </G>
      );
    }
  }

  if (category === 'creative') {
    if (isHealthy) {
      return (
        <G>
          {/* Artist palette with paint spots */}
          <Ellipse cx="365" cy="355" rx="26" ry="18" fill="#FDE68A" transform="rotate(-20 365 355)" />
          <Circle cx="355" cy="350" r="3.5" fill="#EF4444" />
          <Circle cx="365" cy="346" r="3.5" fill="#3B82F6" />
          <Circle cx="375" cy="352" r="3.5" fill="#10B981" />
          <Circle cx="358" cy="360" r="3.5" fill="#8B5CF6" />
          {/* Palette thumb hole */}
          <Circle cx="378" cy="362" r="3" fill="#D97706" />
        </G>
      );
    } else {
      return (
        <G>
          {/* Snapped broken pencil on floor */}
          <Rect x="340" y="385" width="20" height="6" fill="#F59E0B" transform="rotate(10 340 385)" />
          <Rect x="368" y="390" width="18" height="6" fill="#F59E0B" transform="rotate(-25 368 390)" />
        </G>
      );
    }
  }

  // Generic accessory: golden star if healthy, wilted daisy if struggling
  if (isHealthy) {
    return (
      <G>
        <Path
          d="M 365 340 L 372 355 L 388 357 L 376 368 L 380 384 L 365 375 L 350 384 L 354 368 L 342 357 L 358 355 Z"
          fill="#FACC15"
          stroke="#EAB308"
          strokeWidth="2"
        />
      </G>
    );
  } else {
    return (
      <G>
        {/* Wilted flower drooping */}
        <Path d="M 370 410 Q 375 390 360 380" stroke="#16A34A" strokeWidth="3" fill="none" />
        <Circle cx="355" cy="380" r="8" fill="#E2E8F0" />
        <Circle cx="355" cy="380" r="4" fill="#F59E0B" />
      </G>
    );
  }
};
