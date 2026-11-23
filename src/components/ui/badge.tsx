// Mục đích: Component nhãn trạng thái (Badge) dùng chung theo phong cách React Native Reusables.
// src/components/ui/badge.tsx
// Nhãn trạng thái chuẩn shadcn

import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex flex-row items-center rounded-full px-2.5 py-0.5 border text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  label?: string;
  children?: React.ReactNode;
  textClassName?: string;
}

export function Badge({
  className,
  variant,
  label,
  children,
  textClassName,
  ...props
}: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {label ? (
        <Text
          className={cn(
            'text-xs font-medium',
            variant === 'success' && 'text-emerald-700 dark:text-emerald-300',
            variant === 'warning' && 'text-amber-700 dark:text-amber-300',
            variant === 'destructive' && 'text-destructive',
            variant === 'default' && 'text-primary font-semibold',
            variant === 'outline' && 'text-muted-foreground',
            textClassName
          )}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
