import React, { useState, useRef, useEffect } from 'react';

interface LightboxProps {
  imageUrl: string;
  filter?: string;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ imageUrl, filter = 'none', onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -Math.sign(e.deltaY) * 0.2;
    const newScale = Math.min(Math.max(0.5, scale + delta), 5);
    setScale(newScale);
    if (newScale <= 1) setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
         <span className="text-white/70 text-sm font-mono hidden sm:block">Scroll to zoom • Drag to pan</span>
         <span className="text-white/70 text-sm font-mono sm:hidden">Pinch/Scroll to zoom</span>
         <div className="flex gap-4 items-center">
             <div className="flex bg-slate-800/80 backdrop-blur rounded-lg overflow-hidden border border-slate-700">
                <button onClick={() => setScale(Math.max(0.5, scale - 0.5))} className="p-2 hover:bg-white/10 text-white w-10 active:bg-white/20">-</button>
                <span className="p-2 text-white/50 text-xs min-w-[3rem] text-center flex items-center justify-center font-mono">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(Math.min(5, scale + 0.5))} className="p-2 hover:bg-white/10 text-white w-10 active:bg-white/20">+</button>
             </div>
             <button 
                onClick={onClose} 
                className="bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-white rounded-full p-2 border border-slate-700 transition-all"
                title="Close (Esc)"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
         </div>
      </div>

      <div 
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={scale === 1 ? onClose : undefined}
      >
        <img 
            src={imageUrl} 
            alt="Fullscreen preview"
            className="transition-transform duration-75 ease-out max-w-[95vw] max-h-[90vh] object-contain shadow-2xl"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                filter: filter
            }}
            draggable={false}
            onClick={(e) => e.stopPropagation()} 
        />
      </div>
    </div>
  );
};