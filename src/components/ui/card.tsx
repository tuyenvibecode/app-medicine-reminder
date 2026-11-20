// src/components/ui/card.tsx
// Thẻ hiển thị kiểu shadcn (React Native Reusables)
// Thiết kế bo tròn mềm mại (radius 20-24px), viền mỏng tinh tế, bóng đổ nhẹ

import React from 'react';
import { View, Text, type ViewProps, type TextProps } from 'react-native';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-3xl border border-border/80 bg-card p-5 shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('flex-col space-y-1.5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn(
        'text-lg font-semibold tracking-tight text-card-foreground',
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: TextProps) {
  return (
    <Text
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('pt-1', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex-row items-center pt-4', className)}
      {...props}
    />
  );
}
