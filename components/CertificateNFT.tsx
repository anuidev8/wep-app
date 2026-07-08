import React, { useState, useEffect, useRef } from 'react';
import { Check, Download, Share2, FileText, X, Twitter, Facebook, MessageCircle } from 'lucide-react';
import { generateMandala, downloadScreenshot } from '../services/certificateService';
import certificateGenerator, { SessionData } from '../services/certificateGenerator';

interface CertificateNFTProps {
  userName: string;
  date: string;
  message: string;
  symbolType?: string;
  sessionDurationMinutes?: number;
  breathsCompleted?: number;
  practiceType?: string;
  sessionId?: string;
  onFinish: () => void;
}

// Elemental Symbol Component (copied from MorningRitual.tsx)
const ElementalSymbol: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
  const symbolStyle = { fill: '#D4A574', stroke: '#D4A574', strokeWidth: 2 };
  
  switch (type) {
    case 'air':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={className}>
          <path d="M50 20 Q30 40, 50 50 T50 80" {...symbolStyle} fill="none" />
          <path d="M50 20 Q70 40, 50 50 T50 80" {...symbolStyle} fill="none" />
          <circle cx="50" cy="20" r="4" {...symbolStyle} />
        </svg>
      );
    case 'water':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={className}>
          <path d="M20 50 Q30 30, 50 50 T80 50" {...symbolStyle} fill="none" />
          <path d="M20 60 Q30 40, 50 60 T80 60" {...symbolStyle} fill="none" />
        </svg>
      );
    case 'fire':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={className}>
          <path d="M50 80 L45 50 L50 20 L55 50 Z" {...symbolStyle} fill="none" />
          <path d="M50 20 Q40 30, 45 40" {...symbolStyle} fill="none" />
          <path d="M50 20 Q60 30, 55 40" {...symbolStyle} fill="none" />
        </svg>
      );
    case 'space':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="30" {...symbolStyle} fill="none" />
          <line x1="50" y1="20" x2="50" y2="80" {...symbolStyle} />
          <line x1="20" y1="50" x2="80" y2="50" {...symbolStyle} />
        </svg>
      );
    case 'earth':
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={className}>
          <rect x="30" y="50" width="40" height="30" rx="4" {...symbolStyle} fill="none" />
          <line x1="30" y1="50" x2="50" y2="30" {...symbolStyle} />
          <line x1="70" y1="50" x2="50" y2="30" {...symbolStyle} />
        </svg>
      );
    default:
      return (
        <svg width="80" height="80" viewBox="0 0 100 100" className={className}>
          <circle cx="50" cy="50" r="30" {...symbolStyle} fill="none" />
        </svg>
      );
  }
};

export const CertificateNFT: React.FC<CertificateNFTProps> = ({
  userName,
  date,
  message,
  symbolType = 'space',
  sessionDurationMinutes = 0,
  breathsCompleted,
  practiceType,
  sessionId,
  onFinish,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [mandalaUrl, setMandalaUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Generate mandala on component mount
  useEffect(() => {
    const generatePersonalizedMandala = async () => {
      setIsGenerating(true);
      try {
        const mandala = await generateMandala({
          userName,
          date,
          message,
          symbolType,
        });
        setMandalaUrl(mandala);
      } catch (error) {
        console.error('Failed to generate mandala:', error);
        // Fallback to a placeholder or empty state
        setMandalaUrl(null);
      } finally {
        setIsGenerating(false);
      }
    };

    generatePersonalizedMandala();
  }, [userName, date, message, symbolType]);

  // Download certificate screenshot (PNG)
  const handleDownloadImage = async () => {
    if (!certificateRef.current) return;

    setIsGeneratingCertificate(true);
    try {
      await downloadScreenshot(certificateRef.current, `breathwork-certificate-${Date.now()}.png`);
    } catch (error) {
      console.error('Failed to generate certificate:', error);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // Download PDF certificate
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const sessionData: SessionData = {
        userName,
        date,
        message,
        symbolType,
        sessionDurationMinutes,
        breathsCompleted,
        practiceType,
        sessionId: sessionId || Date.now().toString(),
        duration: sessionDurationMinutes ? `${sessionDurationMinutes} min` : undefined,
      };
      await certificateGenerator.downloadCertificate(sessionData);
    } catch (error) {
      console.error('Failed to generate PDF certificate:', error);
      // Fallback to PNG if PDF fails
      if (certificateRef.current) {
        await downloadScreenshot(certificateRef.current, `breathwork-certificate-${Date.now()}.png`);
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Enhanced share functionality with image support
  const handleShare = async () => {
    try {
      const shareText = `I just completed a ${practiceType || 'breathwork'} practice session! 🧘‍♂️✨\n\n${message}\n\n${sessionDurationMinutes > 0 ? `${sessionDurationMinutes} minutes of ` : ''}breathwork at The School of Breath.\n\n#Breathwork #Mindfulness #TheSchoolOfBreath`;
      const shareUrl = window.location.origin;

      // Try to share with image if available and supported
      if (mandalaUrl && navigator.share && navigator.canShare) {
        try {
          // Convert data URL to File for sharing
          const response = await fetch(mandalaUrl);
          const blob = await response.blob();
          const file = new File([blob], `mandala-${userName}-${Date.now()}.png`, { type: 'image/png' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'My Breathwork Achievement',
              text: shareText,
              url: shareUrl,
              files: [file],
            });
            return;
          }
        } catch (fileShareError) {
          console.log('File sharing not supported, falling back to text share');
        }
      }

      // Standard Web Share API (text only)
      if (navigator.share) {
        await navigator.share({
          title: 'My Breathwork Achievement',
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('Share text copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Share failed:', error);
        // Final fallback: Copy to clipboard
        try {
          const shareText = `I just completed a ${practiceType || 'breathwork'} practice session! 🧘‍♂️✨\n\n${message}\n\n${sessionDurationMinutes > 0 ? `${sessionDurationMinutes} minutes of ` : ''}breathwork at The School of Breath.\n\n#Breathwork #Mindfulness #TheSchoolOfBreath`;
          await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`);
          alert('Share text copied to clipboard!');
        } catch (clipboardError) {
          console.error('Clipboard copy failed:', clipboardError);
        }
      }
    }
  };

  // Social media platform-specific sharing
  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    const shareText = encodeURIComponent(
      `I just completed a ${practiceType || 'breathwork'} practice session! 🧘‍♂️✨\n\n${message}\n\n${sessionDurationMinutes > 0 ? `${sessionDurationMinutes} minutes of ` : ''}breathwork at The School of Breath.`
    );
    const shareUrl = encodeURIComponent(window.location.origin);
    const hashtags = encodeURIComponent('Breathwork,Mindfulness,TheSchoolOfBreath');

    let shareLink = '';

    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}&hashtags=${hashtags}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${shareText}%20${shareUrl}`;
        break;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-between text-center animate-fade-in relative overflow-hidden">
      {/* Certificate content area - this is what gets captured */}
      <div
        ref={certificateRef}
        className="flex-1 flex flex-col items-center justify-center w-full relative bg-[#0f172a] p-6"
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(212, 165, 116, 0.05) 0%, transparent 50%)'
        }}></div>

        {/* Certificate content - centered */}
        <div className="flex flex-col items-center justify-center space-y-8 max-w-md relative z-10">
          {/* Checkmark icon - positioned higher with margin-bottom */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-[#D4A574]/20 flex items-center justify-center">
              <Check size={32} className="text-[#D4A574]" strokeWidth={2.5} />
            </div>
          </div>

          {/* Mandala container - between checkmark and title */}
          <div 
            className="mandala-container"
            style={{
              width: '200px',
              height: '200px',
              margin: '0 auto 32px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(252, 211, 77, 0.3)',
              border: '3px solid rgba(252, 211, 77, 0.4)',
            }}
          >
            {isGenerating ? (
              <div 
                className="mandala-loader"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.1), rgba(245, 158, 11, 0.1))',
                }}
              >
                <div 
                  className="w-10 h-10 border-[3px] border-[rgba(252,211,77,0.3)] border-t-[rgba(252,211,77,0.9)] rounded-full animate-spin"
                ></div>
                <p 
                  style={{
                    marginTop: '16px',
                    fontSize: '12px',
                    color: 'rgba(252, 211, 77, 0.8)',
                    fontFamily: 'serif',
                  }}
                >
                  Creating your unique mandala...
                </p>
              </div>
            ) : mandalaUrl ? (
              <img 
                src={mandalaUrl} 
                alt="Your unique practice mandala"
                className="mandala-image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div 
                className="mandala-fallback"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.1), rgba(245, 158, 11, 0.1))',
                }}
              >
                <ElementalSymbol type={symbolType} />
              </div>
            )}
          </div>

          {/* Practice Complete title */}
          <div className="text-3xl font-serif font-light text-[#D4A574] tracking-wide">
            Practice Complete
          </div>

          {/* Congrats with name (golden) */}
          <div className="text-4xl font-serif font-light text-[#D4A574] tracking-wide">
            congrats {userName}
          </div>

          {/* Date (lighter golden) */}
          <div className="text-xl font-serif font-light text-[#D4A574]/70 tracking-wide">
            {date}
          </div>

          {/* Motivational message (golden) */}
          <div className="text-2xl font-serif font-light text-[#D4A574]/85 leading-relaxed px-4 mt-4">
            {message}
          </div>
        </div>

        {/* Footer: The School of Breath (subtle golden) */}
        <div className="text-sm font-serif font-light text-[#D4A574]/40 mt-auto pt-8 relative z-10">
          The School of Breath
        </div>
      </div>

      {/* Action buttons - positioned at bottom, outside the screenshot area */}
      <div className="w-full max-w-md mx-auto space-y-3 p-6 pb-8 relative z-10">
        <button
          onClick={() => {
            // Try native share first, then show modal
            if (navigator.share) {
              handleShare();
            } else {
              setShowShareModal(true);
            }
          }}
          disabled={isGeneratingCertificate || isGeneratingPDF}
          className="w-full px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-light text-base hover:bg-white/20 transition-all border border-white/20 shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ maxWidth: '400px', margin: '16px auto' }}
        >
          <Share2 size={18} />
          Share Achievement
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || isGeneratingCertificate}
          className="w-full px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-light text-base hover:bg-white/20 transition-all border border-white/20 shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ maxWidth: '400px', margin: '16px auto' }}
        >
          {isGeneratingPDF ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Generating PDF...
            </>
          ) : (
            <>
              <FileText size={18} />
              Download Certificate (PDF)
            </>
          )}
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={isGeneratingCertificate || isGeneratingPDF}
          className="w-full px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-light text-base hover:bg-white/20 transition-all border border-white/20 shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ maxWidth: '400px', margin: '16px auto' }}
        >
          {isGeneratingCertificate ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Generating...
            </>
          ) : (
            <>
              <Download size={18} />
              Download Image (PNG)
            </>
          )}
        </button>

        <button
          onClick={onFinish}
          disabled={isGeneratingCertificate}
          className="w-full px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-light text-base hover:bg-white/20 transition-all border border-white/20 shadow-xl active:scale-[0.98] disabled:opacity-50"
          style={{ maxWidth: '400px', margin: '16px auto' }}
        >
          Return Home
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-[#0f172a] border border-[#D4A574]/30 rounded-2xl p-6 max-w-sm w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif text-[#D4A574]">Share Your Achievement</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-white/70" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Native Share (if available) */}
              {navigator.share && (
                <button
                  onClick={async () => {
                    await handleShare();
                    setShowShareModal(false);
                  }}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 flex items-center justify-center gap-3 text-white"
                >
                  <Share2 size={20} />
                  <span>Share via...</span>
                </button>
              )}

              {/* Social Media Options */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    handleSocialShare('twitter');
                    setShowShareModal(false);
                  }}
                  className="px-4 py-3 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 rounded-xl transition-all border border-[#1DA1F2]/30 flex flex-col items-center justify-center gap-2 text-white"
                >
                  <Twitter size={24} className="text-[#1DA1F2]" />
                  <span className="text-xs">Twitter</span>
                </button>

                <button
                  onClick={() => {
                    handleSocialShare('facebook');
                    setShowShareModal(false);
                  }}
                  className="px-4 py-3 bg-[#1877F2]/20 hover:bg-[#1877F2]/30 rounded-xl transition-all border border-[#1877F2]/30 flex flex-col items-center justify-center gap-2 text-white"
                >
                  <Facebook size={24} className="text-[#1877F2]" />
                  <span className="text-xs">Facebook</span>
                </button>

                <button
                  onClick={() => {
                    handleSocialShare('whatsapp');
                    setShowShareModal(false);
                  }}
                  className="px-4 py-3 bg-[#25D366]/20 hover:bg-[#25D366]/30 rounded-xl transition-all border border-[#25D366]/30 flex flex-col items-center justify-center gap-2 text-white"
                >
                  <MessageCircle size={24} className="text-[#25D366]" />
                  <span className="text-xs">WhatsApp</span>
                </button>
              </div>

              {/* Copy Link */}
              <button
                onClick={async () => {
                  const shareText = `I just completed a ${practiceType || 'breathwork'} practice session! 🧘‍♂️✨\n\n${message}\n\n${sessionDurationMinutes > 0 ? `${sessionDurationMinutes} minutes of ` : ''}breathwork at The School of Breath.\n\n#Breathwork #Mindfulness #TheSchoolOfBreath`;
                  await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`);
                  alert('Link copied to clipboard!');
                  setShowShareModal(false);
                }}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20 flex items-center justify-center gap-3 text-white"
              >
                <Download size={20} />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {(isGeneratingCertificate || isGeneratingPDF) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#0f172a] border border-[#D4A574]/30 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin"></div>
            <p className="text-[#D4A574] font-serif">
              {isGeneratingPDF ? 'Creating your PDF certificate...' : 'Creating your certificate...'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

