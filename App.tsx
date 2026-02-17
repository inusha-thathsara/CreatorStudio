import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { generateVisualPrompts, generateImage } from './services/geminiService';
import { ImageState, PlatformKey, PLATFORMS, VisualPrompts } from './types';
import { Button } from './components/Button';
import { ImageCard } from './components/ImageCard';
import { Lightbox } from './components/Lightbox';

interface PreviewState {
  url: string;
  filter: string;
}

const EXAMPLE_PROMPTS = [
  "Cyberpunk coffee shop in Tokyo, neon lights, rain, cinematic, 8k",
  "Minimalist eco-friendly packaging for organic skincare, soft lighting, pastel colors",
  "Professional LinkedIn header for a Senior Software Engineer, abstract code, dark blue theme",
  "Futuristic electric car concept, salt flats, sunset, high contrast, wide angle"
];

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for all 4 platforms
  const [images, setImages] = useState<Record<PlatformKey, ImageState>>({
    linkedin: { status: 'idle' },
    twitter: { status: 'idle' },
    instagram: { status: 'idle' },
    blog: { status: 'idle' },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // Helper to update specific platform state
  const updateImageState = (key: PlatformKey, newState: Partial<ImageState>) => {
    setImages(prev => ({
      ...prev,
      [key]: { ...prev[key], ...newState }
    }));
  };

  const handleGenerateAll = async () => {
    if (!userInput.trim() && !selectedImage) return;

    setIsAnalyzing(true);
    
    // Reset all to idle
    PLATFORMS.forEach(p => updateImageState(p.key, { status: 'idle', errorMsg: undefined }));

    try {
      // 1. Analyze text and get prompts
      const visualPrompts = await generateVisualPrompts(userInput, selectedImage || undefined);
      
      setIsAnalyzing(false);

      // Set all to loading state with their specific prompts immediately so user sees the plan
      PLATFORMS.forEach(p => {
         updateImageState(p.key, { 
            status: 'loading', 
            prompt: visualPrompts.platforms[p.key] 
         });
      });

      // 2. Trigger image generation for each platform SEQUENTIALLY to avoid rate limits
      for (const platform of PLATFORMS) {
        const prompt = visualPrompts.platforms[platform.key];
        
        // We await each generation to throttle requests
        await triggerImageGeneration(platform.key, prompt, platform.apiAspectRatio, selectedImage || undefined);
        
        // Add a small delay between requests to be safe (helps with quota management)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
      // Mark all as error if the initial analysis fails
      PLATFORMS.forEach(p => updateImageState(p.key, { status: 'error', errorMsg: 'Failed to analyze context.' }));
    }
  };

  const triggerImageGeneration = async (key: PlatformKey, prompt: string, aspectRatio: '16:9' | '1:1', refImage?: string) => {
    // We update state here to loading (it might already be loading from handleGenerateAll, but that's fine)
    updateImageState(key, { status: 'loading', prompt });

    try {
      const base64Image = await generateImage(prompt, aspectRatio, refImage);
      updateImageState(key, { status: 'success', imageUrl: base64Image });
    } catch (error) {
      updateImageState(key, { status: 'error', errorMsg: 'Generation failed.' });
    }
  };

  // Allow individual regeneration using the existing prompt
  const handleRegenerateSingle = useCallback((key: PlatformKey) => {
    const currentState = images[key];
    const platformConfig = PLATFORMS.find(p => p.key === key);
    
    if (currentState.prompt && platformConfig) {
      triggerImageGeneration(key, currentState.prompt, platformConfig.apiAspectRatio, selectedImage || undefined);
    }
  }, [images, selectedImage]);

  const handleDownloadAll = async () => {
    setIsZipping(true);
    try {
        const zip = new JSZip();
        let count = 0;
        const timestamp = Date.now();

        // Iterate through all platforms
        PLATFORMS.forEach((platform) => {
            const imgState = images[platform.key];
            if (imgState.status === 'success' && imgState.imageUrl) {
                // imageUrl is "data:image/png;base64,..."
                const base64Data = imgState.imageUrl.split(',')[1];
                if (base64Data) {
                    zip.file(`creator-studio-${platform.key}-${timestamp}.png`, base64Data, { base64: true });
                    count++;
                }
            }
        });

        if (count > 0) {
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `creator-studio-assets-${timestamp}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error("Failed to zip images", error);
    } finally {
        setIsZipping(false);
    }
  };

  const hasSuccessfulImages = Object.values(images).some(img => img.status === 'success');

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text selection:bg-brand-accent selection:text-white pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-dark/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-brand-dark font-bold text-lg shadow-lg shadow-amber-500/20">
               CS
             </div>
             <span className="font-bold text-xl tracking-tight">Creator<span className="text-brand-accent">Studio</span></span>
          </div>
          <div className="text-xs font-mono text-brand-muted hidden sm:block">
            POWERED BY GEMINI NANO
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* Input Section */}
        <section className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Viral Visuals</span> in Seconds
            </h1>
            <p className="text-brand-muted text-lg">
              Paste your caption, context, or upload a reference image. We handle the aesthetics and safe-zones.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-brand-card p-2 rounded-2xl border border-slate-700 shadow-2xl shadow-black/50 ring-1 ring-white/5 relative overflow-hidden transition-all focus-within:ring-brand-accent/50">
              <textarea
                className="w-full h-32 bg-transparent border-0 text-brand-text placeholder-slate-500 focus:ring-0 resize-none p-4 text-lg"
                placeholder="e.g. Launching a new SaaS product for minimalist productivity. Focus on focus, calm, and efficiency..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              
              {/* Image Preview */}
              {selectedImage && (
                <div className="px-4 pb-2">
                  <div className="relative inline-block group">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-600 shadow-md">
                      <img src={selectedImage} alt="Reference" className="w-full h-full object-cover" />
                    </div>
                    <button 
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-slate-800 text-red-400 rounded-full p-1 shadow-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                      title="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-xl mt-2 border-t border-slate-800">
                <div className="flex items-center space-x-4">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleImageUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-brand-muted hover:text-brand-accent transition-colors p-1 rounded-md hover:bg-slate-800"
                    title="Attach reference image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
                  <div className="text-xs text-brand-muted font-mono border-l border-slate-700 pl-4">
                    {userInput.length} chars
                  </div>
                </div>
                
                <Button 
                  onClick={handleGenerateAll} 
                  isLoading={isAnalyzing}
                  disabled={!userInput.trim() && !selectedImage}
                  className="px-8"
                >
                  Generate Assets
                </Button>
              </div>
            </div>

            {/* Example Prompts */}
            <div className="flex flex-wrap gap-2 justify-center px-2">
              <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider py-1.5 mr-1">Try examples:</span>
              {EXAMPLE_PROMPTS.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setUserInput(example)}
                  className="text-xs bg-slate-800/50 hover:bg-brand-accent/10 hover:text-brand-accent hover:border-brand-accent/30 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-full transition-all duration-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Results Grid */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <span className="w-1 h-6 bg-brand-accent rounded-full mr-3"></span>
                Generated Assets
              </h2>
              {isAnalyzing && (
                <span className="text-xs text-brand-accent animate-pulse font-mono hidden sm:inline-block">
                  ANALYZING CONTEXT...
                </span>
              )}
            </div>
            {hasSuccessfulImages && (
              <Button 
                onClick={handleDownloadAll} 
                isLoading={isZipping}
                variant="outline"
                size="sm"
                className="shadow-lg border-brand-accent/50 hover:bg-brand-accent/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download All (ZIP)
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {PLATFORMS.map((platform) => (
              <div key={platform.key} className="h-96">
                <ImageCard 
                  platform={platform}
                  state={images[platform.key]}
                  onRegenerate={() => handleRegenerateSingle(platform.key)}
                  onPreview={(url, filter) => setPreview({ url, filter })}
                />
              </div>
            ))}
          </div>
        </section>

        {preview && (
           <Lightbox 
             imageUrl={preview.url} 
             filter={preview.filter}
             onClose={() => setPreview(null)} 
           />
        )}

      </main>
    </div>
  );
}