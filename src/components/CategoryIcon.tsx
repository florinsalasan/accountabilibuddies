import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '../domain/types.ts';

interface CategoryIconProps {
  category: Category | string;
  size?: number;
  color?: string;
}

const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  fitness: 'barbell',
  finance: 'cash',
  learning: 'book',
  creative: 'color-palette',
  generic: 'sparkles',
};

const CATEGORY_COLORS: Record<Category, string> = {
  fitness: '#EF4444',
  finance: '#10B981',
  learning: '#3B82F6',
  creative: '#8B5CF6',
  generic: '#F59E0B',
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 20,
  color,
}) => {
  const cat = (category as Category) in CATEGORY_ICONS ? (category as Category) : 'generic';
  const iconName = CATEGORY_ICONS[cat];
  const iconColor = color || CATEGORY_COLORS[cat];

  return <Ionicons name={iconName} size={size} color={iconColor} />;
};

export { CATEGORY_COLORS, CATEGORY_ICONS };
