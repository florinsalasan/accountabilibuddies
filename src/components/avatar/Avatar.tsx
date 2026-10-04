import React from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { BackgroundLayer } from './layers/BackgroundLayer.tsx';
import { BaseBodyLayer } from './layers/BaseBodyLayer.tsx';
import { ThemeBodyLayer } from './layers/ThemeBodyLayer.tsx';
import { FaceLayer } from './layers/FaceLayer.tsx';
import { AccessoryLayer } from './layers/AccessoryLayer.tsx';
import { LifeStateOverlay } from './layers/LifeStateOverlay.tsx';
import type { AvatarProps } from './types.ts';

export const Avatar: React.FC<AvatarProps> = ({
  category,
  healthState,
  lifeState = 'active',
  size = 180,
  style,
}) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg viewBox="0 0 512 512" width={size} height={size}>
        {/* Layer 1: Themed environment / background */}
        <BackgroundLayer category={category} healthState={healthState} />

        {/* If dead, the tombstone in LifeStateOverlay replaces/covers parts of the body */}
        {lifeState !== 'dead' && (
          <>
            {/* Layer 2: Core shared creature body */}
            <BaseBodyLayer healthState={healthState} />

            {/* Layer 3: Category body outfit/shape (fit muscles, suit, glasses, beret) */}
            <ThemeBodyLayer category={category} healthState={healthState} />

            {/* Layer 4: Facial expressions (eyes, mouth, tears, blushing) */}
            <FaceLayer healthState={healthState} />

            {/* Layer 5: Category accessories (barbell, gold coins, books, palette) */}
            <AccessoryLayer category={category} healthState={healthState} />
          </>
        )}

        {/* Layer 6: Life-state overlay (Nightcap/Zzz, Royal Crown/Confetti, Siren, Tombstone/Ghost) */}
        <LifeStateOverlay lifeState={lifeState} />
      </Svg>
    </View>
  );
};
