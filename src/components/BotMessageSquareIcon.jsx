import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const BotMessageSquareIcon = forwardRef(
  ({ className, onMouseEnter, onMouseLeave, size = 32, autoAnimate = true, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    useEffect(() => {
      if (!autoAnimate) return;
      const loop = async () => {
        await controls.start('animate');
      };
      loop();
      const interval = setInterval(loop, 4000);
      return () => clearInterval(interval);
    }, [autoAnimate, controls]);

    const handleMouseEnter = useCallback(
      (e) => {
        if (isControlledRef.current) onMouseEnter?.(e);
        else controls.start('animate');
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e) => {
        if (isControlledRef.current) onMouseLeave?.(e);
        else controls.start('normal');
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn('inline-flex items-center justify-center', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          variants={{
            normal: { rotate: 0, y: 0, scale: 1 },
            animate: {
              rotate: [0, -3, 3, 0, 0],
              y: [0, 1.5, -1.5, 0],
              scale: [1, 1.03, 1],
              transition: {
                duration: 1,
                ease: 'easeInOut',
                repeat: 0,
              },
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 6V2H8" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <motion.path
            d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"
            variants={{
              normal: { scale: 1, originX: 0.5, originY: 0.5 },
              animate: {
                scale: [1, 1.04, 1],
                transition: {
                  duration: 0.6,
                  ease: 'easeInOut',
                  repeat: 1,
                },
              },
            }}
          />
          <motion.path
            d="M9 11v2"
            variants={{
              normal: { scaleY: 1, originY: 0.5 },
              animate: {
                scaleY: [1, 0.1, 1],
                transition: { duration: 0.4, ease: 'easeInOut', delay: 0.1 },
              },
            }}
          />
          <motion.path
            d="M15 11v2"
            variants={{
              normal: { scaleY: 1, originY: 0.5 },
              animate: {
                scaleY: [1, 0.1, 1],
                transition: { duration: 0.4, ease: 'easeInOut', delay: 0.2 },
              },
            }}
          />
          <motion.circle
            cx="10"
            cy="18"
            r="0.5"
            variants={{
              normal: { opacity: 0 },
              animate: {
                opacity: [0.3, 1, 0.3],
                transition: {
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.2,
                  delay: 0,
                },
              },
            }}
          />
          <motion.circle
            cx="12"
            cy="18"
            r="0.5"
            variants={{
              normal: { opacity: 0 },
              animate: {
                opacity: [0.3, 1, 0.3],
                transition: {
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.2,
                  delay: 0.3,
                },
              },
            }}
          />
          <motion.circle
            cx="14"
            cy="18"
            r="0.5"
            variants={{
              normal: { opacity: 0 },
              animate: {
                opacity: [0.3, 1, 0.3],
                transition: {
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.2,
                  delay: 0.6,
                },
              },
            }}
          />
        </motion.svg>
      </div>
    );
  }
);

BotMessageSquareIcon.displayName = 'BotMessageSquareIcon';
