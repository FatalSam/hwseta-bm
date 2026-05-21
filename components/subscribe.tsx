'use client';

import React, { useState } from 'react';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { subscribeToNewsletter } from '@/api/communications';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_REGEX.test(trimmed);
}

const Subscribe: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await subscribeToNewsletter(trimmed);
      const message =
        response && typeof response === 'object' && 'message' in response && typeof response.message === 'string'
          ? response.message
          : 'You have been subscribed successfully.';
      setAlertModal({ isOpen: true, message });
      setEmail('');
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to subscribe right now. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full bg-gradient-to-r from-hwseta-green to-hwseta-green-dark flex items-center justify-center min-h-[180px] py-8 sm:py-10 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row w-full max-w-7xl items-center md:justify-between gap-6 md:gap-10">
        <div className="text-center md:text-left text-white w-full md:max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-yellow mb-1">
            Newsletter
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Join our mailing list</h2>
          <p className="text-sm sm:text-base text-white/90">
            Get our news and updates delivered to your inbox.
          </p>
        </div>
        <form className="flex flex-col w-full md:w-auto md:min-w-[320px] max-w-md gap-1" onSubmit={handleSubmit}>
          <div className="flex">
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              aria-invalid={!!error}
              aria-describedby={error ? 'subscribe-email-error' : undefined}
              className={`flex-1 h-12 px-4 text-sm sm:text-base border-0 rounded-l-xl rounded-r-none bg-white text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-hwseta-yellow focus:ring-offset-2 focus:ring-offset-hwseta-green-dark outline-none ${error ? 'ring-2 ring-amber-300' : ''}`}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-6 rounded-r-xl bg-hwseta-red hover:bg-hwseta-red-dark text-white text-sm font-semibold transition-colors whitespace-nowrap focus:ring-2 focus:ring-hwseta-yellow focus:ring-offset-2 focus:ring-offset-hwseta-green-dark"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>
          {error && (
            <p id="subscribe-email-error" className="text-sm text-amber-200 mt-1" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Alert Modal */}
      <ConfirmationModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        title="Subscription"
        message={alertModal.message}
        type="alert"
      />
    </section>
  );
};

export default Subscribe;
