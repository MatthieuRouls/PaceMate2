'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 375 374.999991"
        className="w-full h-full"
      >
        <style>{`
          @keyframes drawBar1 {
            0% {
              stroke-dashoffset: 450;
              fill: none;
            }
            30% {
              stroke-dashoffset: 0;
              fill: none;
            }
            40% {
              fill: #32D18A;
            }
            90% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }

          @keyframes drawBar2 {
            0%, 15% {
              stroke-dashoffset: 450;
              fill: none;
            }
            45% {
              stroke-dashoffset: 0;
              fill: none;
            }
            55% {
              fill: #32D18A;
            }
            90% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }

          @keyframes drawBar3 {
            0%, 30% {
              stroke-dashoffset: 250;
              fill: none;
            }
            60% {
              stroke-dashoffset: 0;
              fill: none;
            }
            70% {
              fill: #32D18A;
            }
            90% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }

          .bar1 {
            stroke: #32D18A;
            stroke-width: 2;
            fill: none;
            stroke-dasharray: 450;
            stroke-dashoffset: 450;
            animation: drawBar1 2.5s ease-in-out infinite;
          }

          .bar2 {
            stroke: #32D18A;
            stroke-width: 2;
            fill: none;
            stroke-dasharray: 450;
            stroke-dashoffset: 450;
            animation: drawBar2 2.5s ease-in-out infinite;
          }

          .bar3 {
            stroke: #32D18A;
            stroke-width: 2;
            fill: none;
            stroke-dasharray: 250;
            stroke-dashoffset: 250;
            animation: drawBar3 2.5s ease-in-out infinite;
          }
        `}</style>

        {/* Bar 1 - Left bar */}
        <path
          className="bar1"
          d="M 0.00390625 270.898438 L 120.871094 65.414062 L 186.542969 104.042969 L 65.675781 309.527344 Z"
        />

        {/* Bar 2 - Middle bar */}
        <path
          className="bar2"
          d="M 137.230469 270.898438 L 258.097656 65.414062 L 323.773438 104.042969 L 202.90625 309.527344 Z"
        />

        {/* Bar 3 - Right dot/bar */}
        <path
          className="bar3"
          d="M 272.480469 270.898438 L 309.328125 208.253906 L 375.152344 246.972656 L 338.304688 309.617188 Z"
        />
      </svg>
    </div>
  );
}
