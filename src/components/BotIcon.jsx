import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const BotIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 22, autoAnimate = true, ...props }, ref) => {
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
      const blink = async () => {
        await controls.start('animate');
      };
      // Blink periodically
      const interval = setInterval(blink, 3200);
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
        className={cn('inline-flex items-center justify-center align-middle', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 8V4H8" />
          <rect height="12" rx="2" width="16" x="4" y="8" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />

          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { y1: 13, y2: 15 },
              animate: {
                y1: [13, 14, 13],
                y2: [15, 14, 15],
                transition: {
                  duration: 0.5,
                  ease: 'easeInOut',
                  delay: 0.1,
                },
              },
            }}
            x1={15}
            x2={15}
          />

          <motion.line
            animate={controls}
            initial="normal"
            variants={{
              normal: { y1: 13, y2: 15 },
              animate: {
                y1: [13, 14, 13],
                y2: [15, 14, 15],
                transition: {
                  duration: 0.5,
                  ease: 'easeInOut',
                  delay: 0.1,
                },
              },
            }}
            x1={9}
            x2={9}
          />
        </svg>
      </div>
    );
  }
);

BotIcon.displayName = 'BotIcon';
