// src/components/ui/button.tsx
// Nút bấm phong cách shadcn (React Native Reusables)
// Có hiệu ứng nhún lò xo mượt (spring animation) và rung phản hồi (haptics)

import React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-2xl active:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-primary active:bg-primary/90',
        destructive: 'bg-destructive active:bg-destructive/90',
        outline:
          'border border-border bg-card active:bg-muted/60',
        secondary:
          'bg-secondary active:bg-secondary/80',
        ghost: 'active:bg-muted/50',
        link: 'text-primary underline-offset-4',
        success: 'bg-emerald-600 active:bg-emerald-700',
      },
      size: {
        default: 'h-13 px-5 py-3', // Tối thiểu 52dp, dễ chạm cho người lớn tuổi
        sm: 'h-10 px-3.5 py-2 rounded-xl',
        lg: 'h-15 px-8 py-4 rounded-3xl',
        icon: 'h-12 w-12 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('font-medium text-center', {
  variants: {
    variant: {
      default: 'text-primary-foreground font-semibold text-base',
      destructive: 'text-destructive-foreground font-semibold text-base',
      outline: 'text-foreground font-medium text-base',
      secondary: 'text-secondary-foreground font-semibold text-base',
      ghost: 'text-foreground font-medium text-base',
      link: 'text-primary font-medium text-base underline',
      success: 'text-white font-semibold text-base',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  className?: string;
  textClassName?: string;
  title?: string;
  haptic?: boolean;
}

export function Button({
  className,
  textClassName,
  variant,
  size,
  children,
  title,
  onPress,
  onPressIn,
  onPressOut,
  haptic = true,
  disabled,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 350 });
    if (haptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      style={animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant, size }),
        disabled && 'opacity-50',
        className
      )}
      {...props}
    >
      {title ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
          {title}
        </Text>
      ) : typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
