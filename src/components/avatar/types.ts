import type { Category, HealthState, LifeState } from '../../domain/types.ts';

export interface AvatarProps {
  category: Category;
  healthState: HealthState;
  lifeState?: LifeState;
  size?: number;
  style?: any;
}
