import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, ExternalLink, Loader2, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';

const isPdfUrl = (url: string) => /\.pdf(\?|#|$)/i.test(url);

export const PdfViewer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawUrl = searchParams.get('url') || '';
  const title = searchParams.get('title') || 'PDF';

  const decodedUrl = useMemo(() => {
    try {
      return decodeURIComponent(rawUrl);
    } catch {
      return rawUrl;
    }
  }, [rawUrl]);

  const decodedTitle = useMemo(() => {
    try {
      return decodeURIComponent(title);
    } catch {
      return title;
    }
  }, [title]);

  const downloadAndOpenPdf = async () => {
    if (!decodedUrl) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch the PDF
      const response = await fetch(decodedUrl);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      
      const blob = await response.blob();
      
      // 2. Convert to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.readAsDataURL(blob);
      });

      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64String = base64Data.split(',')[1];

      // 3. Write to Filesystem
      const fileName = `course_material_${Date.now()}.pdf`;
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64String,
        directory: Directory.Cache,
      });

      // 4. Open with FileOpener
      await FileOpener.openFile({
        path: result.uri,
      });
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error opening PDF:', err);
      setError(err.message || 'Failed to open PDF');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform() && decodedUrl) {
      downloadAndOpenPdf();
    }
  }, [decodedUrl]);

  const viewerUrl = useMemo(() => {
    if (!decodedUrl) return '';
    
    // For native, we don't use the iframe url in the main view, 
    // but we might want a fallback or just show a button.
    // However, if we are here, we are either on web or native failed/waiting.
    
    // On web, we can try to render PDF directly, but Google Docs Viewer is often safer 
    // for compatibility across browsers anyway.
    if (isPdfUrl(decodedUrl)) return decodedUrl;
    
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(decodedUrl)}`;
  }, [decodedUrl]);

  const handleOpenExternal = () => {
    if (decodedUrl) {
      window.open(decodedUrl, '_system');
    }
  };

  if (!decodedUrl) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center p-6">
        <div className="bg-white dark:bg-brand-darkSurface rounded-2xl p-8 max-w-md w-full border border-brand-dark/5 dark:border-white/10">
          <div className="flex items-center gap-3 mb-4 text-brand-dark dark:text-white">
            <FileText className="w-6 h-6" />
            <h2 className="text-lg font-bold">PDF not available</h2>
          </div>
          <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted mb-6">
            No PDF URL was provided for this lesson.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-xl bg-brand-dark text-white font-semibold"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Native View
  if (Capacitor.isNativePlatform()) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center p-6">
        <div className="bg-white dark:bg-brand-darkSurface rounded-2xl p-8 max-w-md w-full border border-brand-dark/5 dark:border-white/10 text-center">
            {isLoading ? (
                <>
                    <Loader2 className="w-10 h-10 animate-spin text-brand-primary dark:text-brand-gold mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-brand-dark dark:text-white mb-2">Opening PDF...</h2>
                    <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted">
                        Please wait while we prepare the document.
                    </p>
                </>
            ) : error ? (
                <>
                    <div className="flex items-center justify-center gap-2 mb-4 text-red-500">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-bold text-brand-dark dark:text-white mb-2">Could not open PDF</h2>
                    <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted mb-6">
                        {error}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex-1 py-3 rounded-xl bg-brand-light dark:bg-brand-darkBase text-brand-dark dark:text-white font-semibold"
                        >
                            Back
                        </button>
                        <button
                            onClick={downloadAndOpenPdf}
                            className="flex-1 py-3 rounded-xl bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark font-semibold"
                        >
                            Retry
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-center gap-2 mb-4 text-brand-primary dark:text-brand-gold">
                        <FileText className="w-10 h-10" />
                    </div>
                    <h2 className="text-lg font-bold text-brand-dark dark:text-white mb-2">{decodedTitle}</h2>
                    <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted mb-6">
                        The document should be open in your default viewer.
                    </p>
                     <div className="flex gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex-1 py-3 rounded-xl bg-brand-light dark:bg-brand-darkBase text-brand-dark dark:text-white font-semibold"
                        >
                            Back
                        </button>
                        <button
                            onClick={downloadAndOpenPdf}
                            className="flex-1 py-3 rounded-xl bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark font-semibold flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Open Again
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
    );
  }

  // Web View
  return (
    <div
      className="bg-brand-cream dark:bg-brand-darkBase flex flex-col"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="sticky top-0 z-20 bg-brand-cream/95 dark:bg-brand-darkBase/95 backdrop-blur border-b border-brand-dark/5 dark:border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-dark shadow-md dark:bg-brand-darkSurface dark:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-dark dark:text-white">{decodedTitle}</p>
            <p className="text-xs text-brand-medium dark:text-brand-darkTextMuted">PDF Viewer</p>
          </div>
          <button
            onClick={handleOpenExternal}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-dark shadow-md dark:bg-brand-darkSurface dark:text-white"
            aria-label="Open in Browser"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <iframe
          title="PDF Viewer"
          src={viewerUrl}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};