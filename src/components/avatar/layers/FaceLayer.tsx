import React from 'react';
import { G, Circle, Path, Ellipse } from 'react-native-svg';
import type { HealthState } from '../../../domain/types.ts';

interface Props {
  healthState: HealthState;
}

export const FaceLayer: React.FC<Props> = ({ healthState }) => {
  if (healthState === 'thriving') {
    return (
      <G>
        {/* Rosy blushing cheeks */}
        <Ellipse cx="195" cy="235" rx="14" ry="8" fill="#F43F5E" opacity="0.6" />
        <Ellipse cx="317" cy="235" rx="14" ry="8" fill="#F43F5E" opacity="0.6" />

        {/* Big sparkling joyful eyes */}
        <Circle cx="215" cy="210" r="14" fill="#0F172A" />
        <Circle cx="297" cy="210" r="14" fill="#0F172A" />
        {/* Sparkle highlights */}
        <Circle cx="212" cy="206" r="5" fill="#FFFFFF" />
        <Circle cx="218" cy="213" r="2.5" fill="#FFFFFF" />
        <Circle cx="294" cy="206" r="5" fill="#FFFFFF" />
        <Circle cx="300" cy="213" r="2.5" fill="#FFFFFF" />

        {/* Big happy open smile with tongue */}
        <Path
          d="M 232 232 Q 256 265 280 232 Z"
          fill="#BE123C"
        />
        <Path
          d="M 244 246 Q 256 240 268 246 Q 256 262 244 246 Z"
          fill="#FB7185"
        />
      </G>
    );
  }

  if (healthState === 'good') {
    return (
      <G>
        {/* Friendly blush */}
        <Ellipse cx="198" cy="235" rx="10" ry="6" fill="#F43F5E" opacity="0.4" />
        <Ellipse cx="314" cy="235" rx="10" ry="6" fill="#F43F5E" opacity="0.4" />

        {/* Happy curved eyes (anime style) */}
        <Path
          d="M 205 212 Q 215 198 225 212"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 287 212 Q 297 198 307 212"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Warm smile */}
        <Path
          d="M 240 235 Q 256 250 272 235"
          stroke="#0F172A"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </G>
    );
  }

  if (healthState === 'meh') {
    return (
      <G>
        {/* Normal dot eyes */}
        <Circle cx="215" cy="210" r="9" fill="#1E293B" />
        <Circle cx="213" cy="208" r="3" fill="#FFFFFF" />
        <Circle cx="297" cy="210" r="9" fill="#1E293B" />
        <Circle cx="295" cy="208" r="3" fill="#FFFFFF" />

        {/* Neutral flat mouth */}
        <Path
          d="M 242 238 L 270 238"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </G>
    );
  }

  if (healthState === 'struggling') {
    return (
      <G>
        {/* Worried furrowed eyebrows */}
        <Path d="M 202 195 L 226 202" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
        <Path d="M 310 195 L 286 202" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />

        {/* Worried eyes */}
        <Circle cx="216" cy="214" r="8" fill="#1E293B" />
        <Circle cx="296" cy="214" r="8" fill="#1E293B" />

        {/* Anxious sweat drop */}
        <Path
          d="M 324 190 C 324 190, 318 198, 318 202 C 318 205, 321 208, 324 208 C 327 208, 330 205, 330 202 C 330 198, 324 190, 324 190 Z"
          fill="#38BDF8"
        />

        {/* Uneasy wavy mouth */}
        <Path
          d="M 240 242 Q 248 238 256 242 Q 264 246 272 242"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </G>
    );
  }

  // Dying: teary pleading eyes and trembling mouth
  return (
    <G>
      {/* Distressed sad eyebrows */}
      <Path d="M 200 192 L 226 198" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
      <Path d="M 312 192 L 286 198" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

      {/* Big watery eyes with tear puddle */}
      <Ellipse cx="215" cy="216" rx="12" ry="14" fill="#1E293B" />
      <Circle cx="211" cy="211" r="5" fill="#FFFFFF" />
      <Circle cx="218" cy="221" r="3" fill="#FFFFFF" />

      <Ellipse cx="297" cy="216" rx="12" ry="14" fill="#1E293B" />
      <Circle cx="293" cy="211" r="5" fill="#FFFFFF" />
      <Circle cx="300" cy="221" r="3" fill="#FFFFFF" />

      {/* Tears streaming down */}
      <Path
        d="M 215 230 Q 212 250 216 260"
        stroke="#38BDF8"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 297 230 Q 300 250 296 260"
        stroke="#38BDF8"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Multiple anxious sweat drops */}
      <Path
        d="M 335 185 C 335 185, 328 195, 328 200 C 328 204, 331 207, 335 207 C 339 207, 342 204, 342 200 C 342 195, 335 185, 335 185 Z"
        fill="#38BDF8"
      />

      {/* Trembling downturned mouth */}
      <Path
        d="M 238 248 Q 247 242 256 245 Q 265 242 274 248"
        stroke="#334155"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
};
