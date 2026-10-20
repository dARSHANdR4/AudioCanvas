import type { Metadata, Viewport } from 'next';
import { PhotosensitivityNotice } from '@/components/photosensitivity-notice';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AudioCanvas — Sound becomes visual',
    template: '%s · AudioCanvas',
  },
  description: 'A no-code, sound-reactive visualizer studio for creating generative art from your music.',
  applicationName: 'AudioCanvas',
};

export const viewport: Viewport = {
  themeColor: '#0A0A12',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PhotosensitivityNotice />
      </body>
    </html>
  );
}
