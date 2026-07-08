import React, { useEffect, useState, useRef } from 'react';
import { Phone, X, ChevronDown, Check } from 'lucide-react';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { countries, Country } from '../utils/countries';

interface PhoneNumberModalProps {
  open: boolean;
  onSubmit: (phoneNumber: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  defaultValue?: string;
}

export const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({
  open,
  onSubmit,
  onClose,
  isLoading = false,
  defaultValue = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Default to first (US)
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (defaultValue) {
        try {
          // Try to parse the default value to extract country
          // Note: defaultValue should be in E.164 format (e.g., +15551234567)
          const parsed = parsePhoneNumberFromString(defaultValue);
          if (parsed && parsed.country) {
            const country = countries.find(c => c.code === parsed.country);
            if (country) {
              setSelectedCountry(country);
              // Use national format for the input (removes country code)
              setPhoneNumber(parsed.formatNational());
            } else {
              setPhoneNumber(defaultValue);
            }
          } else {
            setPhoneNumber(defaultValue);
          }
        } catch (e) {
          setPhoneNumber(defaultValue);
        }
      } else {
        setPhoneNumber('');
        // Default to India if available, else first in list (US)
        const defaultCountry = countries.find(c => c.code === 'IN') || countries[0];
        setSelectedCountry(defaultCountry);
      }
      setError(null);
      setIsCountryDropdownOpen(false);
    }
  }, [open, defaultValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setError('Please enter your phone number.');
      return;
    }

    try {
      const parsed = parsePhoneNumberFromString(trimmed, selectedCountry.code as CountryCode);
      
      if (!parsed || !parsed.isValid()) {
        setError('Please enter a valid phone number for the selected country.');
        return;
      }

      setError(null);
      // Submit in E.164 format (e.g., +12125551234)
      onSubmit(parsed.format('E.164'));
    } catch (e) {
      setError('Invalid phone number format.');
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" aria-hidden onClick={onClose} />
      <div
        className="relative w-full max-w-sm bg-white dark:bg-brand-darkSurface border border-brand-light dark:border-brand-darkBorder rounded-[32px] shadow-2xl p-6 animate-fade-in"
        role="dialog"
        aria-labelledby="phone-modal-title"
        aria-describedby="phone-modal-desc"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 p-2 rounded-full bg-brand-light/60 dark:bg-white/10 text-brand-medium dark:text-white/80 hover:bg-brand-light transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/30">
            <Phone size={28} className="text-brand-gold" />
          </div>
          <div>
            <h2
              id="phone-modal-title"
              className="text-xl font-serif font-bold text-brand-dark dark:text-white mb-2"
            >
              Confirm your phone number
            </h2>
            <p
              id="phone-modal-desc"
              className="text-sm text-brand-primary dark:text-brand-darkTextMuted leading-relaxed"
            >
              We will only use this to personalize your membership experience.
            </p>
          </div>
          
          <div className="w-full relative">
            <div className="flex gap-2">
              {/* Country Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => !isLoading && setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  disabled={isLoading}
                  className="h-12 px-3 rounded-2xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-brand-darkBase flex items-center gap-2 hover:bg-brand-light/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                >
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <span className="text-sm font-medium text-brand-dark dark:text-white">{selectedCountry.dial_code}</span>
                  <ChevronDown size={14} className={`text-brand-medium dark:text-brand-darkTextMuted transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Country Dropdown */}
                {isCountryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-brand-darkSurface border border-brand-light dark:border-brand-darkBorder rounded-xl shadow-xl z-50 py-1 scrollbar-thin scrollbar-thumb-brand-light dark:scrollbar-thumb-brand-darkBorder">
                    {countries.map((country) => (
                      <button
                        key={country.code}
                        onClick={() => handleCountrySelect(country)}
                        className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-brand-light/30 dark:hover:bg-white/5 transition-colors text-left ${
                          selectedCountry.code === country.code ? 'bg-brand-light/50 dark:bg-white/10' : ''
                        }`}
                      >
                        <span className="text-xl">{country.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-dark dark:text-white truncate">{country.name}</p>
                          <p className="text-xs text-brand-medium dark:text-brand-darkTextMuted">{country.dial_code}</p>
                        </div>
                        {selectedCountry.code === country.code && (
                          <Check size={14} className="text-brand-gold" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Input */}
              <div className="flex-1">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Phone number"
                  className="w-full h-12 rounded-2xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-brand-darkBase px-4 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {error && (
              <p className="mt-2 text-xs text-red-500 text-left pl-1">{error}</p>
            )}
          </div>

          <div className="flex w-full gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-12 rounded-full border border-brand-light dark:border-white/20 text-sm font-semibold text-brand-medium dark:text-white/80 bg-transparent hover:bg-brand-light/10 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Not now
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-12 rounded-full bg-brand-gold hover:bg-brand-gold/90 text-sm font-semibold text-white shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? 'Processing…' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
