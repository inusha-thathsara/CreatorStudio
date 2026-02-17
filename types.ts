export interface VisualPrompts {
  visualStyleSeed: string;
  platforms: {
    linkedin: string;
    twitter: string;
    instagram: string;
    blog: string;
  };
}

export type PlatformKey = 'linkedin' | 'twitter' | 'instagram' | 'blog';

export interface ImageState {
  status: 'idle' | 'loading' | 'success' | 'error';
  imageUrl?: string;
  prompt?: string;
  errorMsg?: string;
}

export type PlatformConfig = {
  key: PlatformKey;
  label: string;
  aspectRatioLabel: string;
  apiAspectRatio: '16:9' | '1:1'; // Gemini API allowed values
  description: string;
};

export const PLATFORMS: PlatformConfig[] = [
  {
    key: 'linkedin',
    label: 'LinkedIn Cover',
    aspectRatioLabel: '3:1 (Generated as 16:9)',
    apiAspectRatio: '16:9',
    description: 'Safe zone: Subject in right third. Bottom-left blocked.'
  },
  {
    key: 'twitter',
    label: 'X / Twitter Header',
    aspectRatioLabel: '3:1 (Generated as 16:9)',
    apiAspectRatio: '16:9',
    description: 'Focus centered/right. Bottom-left overlap.'
  },
  {
    key: 'instagram',
    label: 'Instagram Post',
    aspectRatioLabel: '1:1',
    apiAspectRatio: '1:1',
    description: 'Centered composition. Square format.'
  },
  {
    key: 'blog',
    label: 'Blog Header',
    aspectRatioLabel: '16:9',
    apiAspectRatio: '16:9',
    description: 'Cinematic wide shot. Text-safe bottom area.'
  }
];