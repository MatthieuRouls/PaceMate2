'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const bar1Ref = useRef<SVGPathElement>(null);
  const bar2Ref = useRef<SVGPathElement>(null);
  const bar3Ref = useRef<SVGPathElement>(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  useEffect(() => {
    const bars = [bar1Ref.current, bar2Ref.current, bar3Ref.current];

    // Initialize all bars with stroke properties
    bars.forEach((bar) => {
      if (bar) {
        const pathLength = bar.getTotalLength();
        gsap.set(bar, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
          stroke: '#32D18A',
          strokeWidth: 2,
          fill: 'none',
        });
      }
    });

    // Create the animation timeline
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });

    // Animate each bar sequentially (drawing effect)
    bars.forEach((bar, index) => {
      if (bar) {
        tl.to(bar, {
          strokeDashoffset: 0,
          duration: 0.6,
          ease: 'power2.inOut',
        }, index * 0.2); // Stagger the start of each bar
      }
    });

    // After all bars are drawn, fill them with color
    tl.to(bars, {
      fill: '#32D18A',
      stroke: 'none',
      duration: 0.3,
      ease: 'power1.out',
    }, '+=0.1');

    // Hold for a moment
    tl.to({}, { duration: 0.4 });

    // Reset (fade out and reset stroke)
    tl.to(bars, {
      opacity: 0,
      duration: 0.3,
      ease: 'power1.in',
      onComplete: () => {
        bars.forEach((bar) => {
          if (bar) {
            const pathLength = bar.getTotalLength();
            gsap.set(bar, {
              strokeDashoffset: pathLength,
              fill: 'none',
              stroke: '#32D18A',
              opacity: 1,
            });
          }
        });
      },
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 375 374.999991"
        className="w-full h-full"
      >
        {/* Bar 1 - Left bar */}
        <path
          ref={bar1Ref}
          d="M 0.00390625 270.898438 L 120.871094 65.414062 L 186.542969 104.042969 L 65.675781 309.527344 Z"
        />

        {/* Bar 2 - Middle bar */}
        <path
          ref={bar2Ref}
          d="M 137.230469 270.898438 L 258.097656 65.414062 L 323.773438 104.042969 L 202.90625 309.527344 Z"
        />

        {/* Bar 3 - Right dot/bar */}
        <path
          ref={bar3Ref}
          d="M 272.480469 270.898438 L 309.328125 208.253906 L 375.152344 246.972656 L 338.304688 309.617188 Z"
        />
      </svg>
    </div>
  );
}
