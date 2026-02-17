import React, { useState, useEffect } from 'react';
import { ImageState, PlatformConfig } from '../types';
import { Button } from './Button';

interface ImageCardProps {
  platform: PlatformConfig;
  state: ImageState;
  onRegenerate: () => void;
  onPreview: (imageUrl: string, filter: string) => void;
}

const FILTERS = [
  { id: 'none', label: 'Normal', filter: 'none' },
  { id: 'bw', label: 'B&W', filter: 'grayscale(100%)' },
  { id: 'sepia', label: 'Sepia', filter: 'sepia(80%)' },
  { id: 'vibrant', label: 'Vibrant', filter: 'saturate(150%) contrast(110%)' },
  { id: 'cinematic', label: 'Cinema', filter: 'contrast(120%) brightness(90%) sepia(20%)' },
];

export const ImageCard: React.FC<ImageCardProps> = ({ platform, state, onRegenerate, onPreview }) => {
  const [activeFilterId, setActiveFilterId] = useState('none');
  const [isCopied, setIsCopied] = useState(false);

  // Reset filter and copy state when a new image is loaded
  useEffect(() => {
    if (state.status === 'loading') {
        setActiveFilterId('none');
        setIsCopied(false);
    }
  }, [state.status]);

  const activeFilter = FILTERS.find(f => f.id === activeFilterId) || FILTERS[0];

  const handleDownload = () => {
    if (!state.imageUrl) return;

    // Use Canvas to apply filter for download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.src = state.imageUrl;
    // Ensure image is loaded before drawing
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        if (activeFilter.filter !== 'none') {
             ctx.filter = activeFilter.filter;
        }
        ctx.drawImage(img, 0, 0);
      }
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `visual-asset-${platform.key}-${activeFilterId}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  const handleCopyUrl = async () => {
    if (state.imageUrl) {
      try {
        await navigator.clipboard.writeText(state.imageUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-card border border-slate-800 rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/50 hover:border-slate-700 group">
      
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-brand-text tracking-wide uppercase">{platform.label}</h3>
          <p className="text-xs text-brand-muted">{platform.aspectRatioLabel}</p>
        </div>
        <div className="flex space-x-2">
           {(state.status === 'success' || state.status === 'error' || (state.status === 'loading' && state.prompt)) && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={onRegenerate} 
               disabled={state.status === 'loading'}
               title="Regenerate"
               className="!p-1.5"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
             </Button>
           )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow relative bg-slate-950 min-h-[250px] flex items-center justify-center overflow-hidden">
        
        {state.status === 'idle' && (
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-sm text-brand-muted">Ready to generate</p>
          </div>
        )}

        {state.status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-700 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-brand-accent rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            </div>
            <p className="mt-4 text-xs font-mono text-brand-accent animate-pulse">GENERATING VISUALS...</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-center p-6 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto mb-2 opacity-80">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008h-.008v-.008z" />
            </svg>
            <p className="text-sm font-medium">Generation Failed</p>
            <p className="text-xs mt-1 text-red-400/70">{state.errorMsg || 'Please try again.'}</p>
          </div>
        )}

        {state.status === 'success' && state.imageUrl && (
          <>
            <img 
              src={state.imageUrl} 
              alt={`${platform.label} generated content`} 
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: activeFilter.filter }}
            />
            
            {/* Action Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none gap-3">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform scale-95 group-hover:scale-100 duration-200 pointer-events-auto flex gap-2">
                    <Button onClick={handleDownload} variant="primary" className="shadow-2xl">
                        Download
                    </Button>
                    
                    <Button 
                        onClick={handleCopyUrl}
                        variant="secondary"
                        className="shadow-2xl !px-3 bg-white/10 hover:bg-white/20 text-white border-white/20"
                        title="Copy Image URL"
                    >
                        {isCopied ? (
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.381a9.06 9.06 0 001.5-.124A9.06 9.06 0 0021 11.25v-1.125" />
                            </svg>
                        )}
                    </Button>

                    <Button 
                        onClick={() => state.imageUrl && onPreview(state.imageUrl, activeFilter.filter)} 
                        variant="secondary" 
                        className="shadow-2xl !px-3 bg-white/10 hover:bg-white/20 text-white border-white/20"
                        title="Fullscreen Preview"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                         </svg>
                    </Button>
                </div>
            </div>

            {/* Filters Toolbar (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col items-center z-20">
                <div className="flex flex-wrap justify-center gap-2">
                    {FILTERS.map(f => (
                        <button 
                            key={f.id}
                            onClick={() => setActiveFilterId(f.id)}
                            className={`text-[10px] font-medium px-3 py-1 rounded-full border backdrop-blur-sm transition-all ${
                                activeFilterId === f.id 
                                ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-amber-900/20' 
                                : 'bg-black/40 border-white/20 text-white/70 hover:bg-white/10 hover:border-white/40 hover:text-white'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 relative z-30">
        <p className="text-[10px] text-brand-muted line-clamp-2" title={platform.description}>
          <span className="font-semibold text-slate-400">Rules:</span> {platform.description}
        </p>
        {state.prompt && (
             <div className="mt-2 pt-2 border-t border-slate-800/50">
                <p className="text-[10px] text-brand-muted/70 italic line-clamp-2" title={state.prompt}>
                   "{state.prompt}"
                </p>
             </div>
        )}
      </div>
    </div>
  );
};