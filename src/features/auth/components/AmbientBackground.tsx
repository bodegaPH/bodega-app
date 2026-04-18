"use client";

import { useMemo } from "react";

type AmbientCell = {
  baseOpacity: number;
  isPulsing: boolean;
  pulseDelay: string;
  colorIndex: 0 | 1 | 2;
};

export default function AmbientBackground() {
  // Generate a deterministic pattern for filled squares
  const gridCells = useMemo(() => {
    // Large enough to cover a 4k screen at 80px squares (50x30 = 1500 squares)
    const cols = 50;
    const rows = 30;
    const cells: AmbientCell[] = [];
    
    // A simple pseudo-random function so it's consistent between renders
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < cols * rows; i++) {
      // ~15% chance to be filled
      const isFilled = pseudoRandom(i + 42) > 0.85;
      
      // Determine if this cell should have the continuous subtle pulse (~5% of all cells)
      const isPulsing = isFilled && pseudoRandom(i + 100) > 0.6;
      
      // Randomize animation delay so they don't all pulse together
      const pulseDelay = isPulsing ? `${pseudoRandom(i + 200) * 4}s` : '0s';
      
      // Base opacity for filled cells
      const baseOpacity = isFilled ? 0.01 + pseudoRandom(i) * 0.02 : 0;
      
      // Select a deterministic brand color index (0: Blue, 1: Indigo, 2: Cyan)
      const colorIndex = Math.floor(pseudoRandom(i + 300) * 3) as AmbientCell["colorIndex"];
      
      cells.push({
        baseOpacity,
        isPulsing,
        pulseDelay,
        colorIndex
      });
    }
    return { cols, rows, cells };
  }, []);

  // Array of tailwind classes for the scanner
  const hoverClasses = [
    'hover:bg-indigo-500/[0.15]',
    'hover:bg-indigo-500/[0.15]',
    'hover:bg-indigo-500/[0.15]'
  ] as const;

  // Base RGB values for the static opacities
  const staticColors = [
    '99, 102, 241', // indigo-500
    '99, 102, 241', // indigo-500
    '99, 102, 241'  // indigo-500
  ] as const;

  return (
    <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden border-l border-white/5 bg-zinc-950">
      {/* Base Grid Lines */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />
      
      {/* Interactive Grid Cells */}
      <div 
        className="absolute inset-0 z-10"
        style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, 80px)`,
          gridTemplateRows: `repeat(auto-fill, 80px)`,
        }}
      >
        {gridCells.cells.map((cell, i) => (
          <div 
            key={i}
            className={`relative w-[80px] h-[80px] group ${cell.isPulsing ? 'animate-pulse' : ''}`}
            style={{ 
              animationDelay: cell.pulseDelay,
              animationDuration: cell.isPulsing ? '4s' : undefined
            }}
          >
            {/* Base static cell */}
            <div 
              className="absolute inset-0 z-0"
              style={{ backgroundColor: `rgba(${staticColors[cell.colorIndex]}, ${cell.baseOpacity})` }}
            />
            
            {/* Interactive hover comet trail overlay */}
            <div className={`absolute inset-0 z-10 bg-white/0 transition-colors duration-[1500ms] hover:duration-75 ${hoverClasses[cell.colorIndex]}`} />
          </div>
        ))}
      </div>

      {/* Brand Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none select-none">
        <svg 
          className="w-24 h-24 mb-6 opacity-90 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
          viewBox="0 0 20 20" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M1.75 1.75H10.75L16.75 6.25L12.75 9.75L16.75 13.25L10.75 17.75H1.75V1.75Z" stroke="#6366F1" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter"/>
        </svg>
        <div className="flex flex-col items-center gap-2.5">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-indigo-500">
            SECURE INVENTORY MANAGEMENT
          </span>
          <span className="text-lg font-mono text-zinc-200 tracking-[0.15em] uppercase">
            For the modern enterprise
          </span>
        </div>
      </div>

      {/* A dark vignette to fade out the edges */}
      <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_150px_rgba(9,9,11,1)]" />
    </div>
  );
}
