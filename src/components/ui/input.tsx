// src/components/ui/input.tsx
// Ô nhập liệu kiểu shadcn (React Native Reusables)

import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<any, InputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor || '#94A3B8'}
        className={cn(
          'h-12 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
