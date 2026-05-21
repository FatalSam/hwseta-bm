'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { MapPinIcon } from '@heroicons/react/24/outline';
import apiClient from '@/ultis/apiClient';
import { environment } from '@/config/environment';
import {
  resolveAdminAddressPatch,
  type AdminAddressPatch,
  type DropdownOption,
  type GooglePlace,
} from '@/lib/googlePlaceToAdminAddress';

// —— Same minimal types as beneficiary profile (BeneficiaryProfilePage) Google Maps Autocomplete ——
type GoogleAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => GooglePlace;
};

type GoogleMapsApi = {
  maps: {
    event: { clearInstanceListeners: (instance: unknown) => void };
    places: {
      Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => GoogleAutocomplete;
    };
  };
};

const inputShellClass =
  'relative mt-1 block w-full rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-hwseta-green focus-within:ring-1 focus-within:ring-hwseta-green';

const inputInnerClass =
  'w-full rounded-lg border-0 bg-transparent py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0';

type Props = {
  /** When false, tears down Autocomplete (e.g. modal closed). */
  open: boolean;
  /** Unique DOM id suffix for the search input (avoid collisions). */
  instanceId: string;
  onApply: (patch: AdminAddressPatch) => void;
};

export default function AdminAddressPlacesBlock({ open, instanceId, onApply }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const provincesRef = useRef<DropdownOption[]>([]);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  const [provinces, setProvinces] = useState<DropdownOption[]>([]);
  const [provincesLoaded, setProvincesLoaded] = useState(false);

  const googleMapsApiKey = environment.googleMapsApiKey;
  const hasKey = !!googleMapsApiKey;
  const shouldLoadScript = open && hasKey;

  const inputId = `address-autocomplete-${instanceId}`;

  useEffect(() => {
    provincesRef.current = provinces;
  }, [provinces]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProvincesLoaded(false);
    apiClient
      .get('/api/Dropdowns/provinces')
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setProvinces(data);
        provincesRef.current = data;
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      })
      .finally(() => {
        if (!cancelled) setProvincesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const teardown = useCallback(() => {
    const ac = autocompleteRef.current;
    const g = (window as typeof window & { google?: GoogleMapsApi }).google;
    if (ac && g?.maps?.event) {
      try {
        g.maps.event.clearInstanceListeners(ac);
      } catch {
        /* ignore */
      }
    }
    autocompleteRef.current = null;
  }, []);

  /** Mirrors beneficiary `initAutocomplete`: empty deps; provinces read from `provincesRef` inside `place_changed`. */
  const initAutocomplete = useCallback(() => {
    try {
      const g = (window as typeof window & { google?: GoogleMapsApi }).google;
      if (autocompleteRef.current) return;
      if (!g?.maps?.places) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Google Maps Places API not available yet');
        }
        return;
      }

      const input =
        inputRef.current || (typeof document !== 'undefined' ? (document.getElementById(inputId) as HTMLInputElement | null) : null);
      if (!input) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Address input element not found');
        }
        return;
      }
      if (!inputRef.current) inputRef.current = input;

      const ac = new g.maps.places.Autocomplete(input, {
        fields: ['formatted_address', 'address_components', 'geometry'],
        types: ['geocode'],
        componentRestrictions: { country: ['za'] },
      });

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.address_components?.length) return;
        const display = place.formatted_address?.trim();
        if (display) input.value = display;

        void (async () => {
          try {
            const patch = await resolveAdminAddressPatch(place, provincesRef.current);
            if (Object.keys(patch).length > 0) {
              onApplyRef.current(patch);
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Admin address resolve failed', e);
            }
          }
        })();
      });

      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') e.preventDefault();
      });

      autocompleteRef.current = ac;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to init Google Autocomplete', e);
      }
    }
  }, [inputId]);

  useEffect(() => {
    if (!open) {
      teardown();
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [open, teardown]);

  useEffect(() => {
    if (!open || !hasKey) return;

    const tryInit = () => {
      const g = (window as typeof window & { google?: GoogleMapsApi }).google;
      const el =
        inputRef.current || (typeof document !== 'undefined' ? (document.getElementById(inputId) as HTMLInputElement | null) : null);
      if (g?.maps?.places && el && !autocompleteRef.current) {
        if (!inputRef.current) inputRef.current = el;
        initAutocomplete();
        return true;
      }
      return false;
    };

    if (tryInit()) return;
    const timers = [setTimeout(tryInit, 100), setTimeout(tryInit, 500), setTimeout(tryInit, 1000)];
    return () => timers.forEach(clearTimeout);
  }, [open, hasKey, inputId, initAutocomplete, provincesLoaded]);

  return (
    <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
      {shouldLoadScript ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            googleMapsApiKey as string,
          )}&libraries=places&language=en&loading=async`}
          strategy="afterInteractive"
          onLoad={() => {
            setTimeout(() => {
              if (!open) return;
              initAutocomplete();
            }, 200);
          }}
          onError={(e) => console.error('Failed to load Google Maps script:', e)}
        />
      ) : null}

      {!hasKey && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Address search is disabled. Add{' '}
          <code className="rounded bg-amber-100/80 px-1 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="rounded bg-amber-100/80 px-1 py-0.5">.env.local</code>, enable Maps JavaScript API and Places
          API, then restart the dev server.
        </div>
      )}

      <label className="mb-0 block text-sm font-semibold text-slate-800" htmlFor={inputId}>
        <MapPinIcon className="mr-1 inline h-4 w-4 text-hwseta-green" aria-hidden />
        Search Address
        <span className="ml-1 text-red-600">*</span>
      </label>
      <p className="mt-1 text-xs text-slate-500">Start typing to search for your address using Google Maps</p>
      <div className={inputShellClass}>
        <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
          <MapPinIcon className="h-5 w-5" aria-hidden />
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          defaultValue=""
          placeholder="Start typing an address"
          autoComplete="off"
          disabled={!hasKey}
          className={inputInnerClass}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">Powered by Google Places</p>
    </div>
  );
}
