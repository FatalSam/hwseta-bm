'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const slides = [
  {
    image: '/images/hero1.png',
    title: 'Beneficiary monitoring',
    description:
      'Register or sign in to access your HWSETA beneficiary dashboard and stay on top of your programme journey.',
    button: 'Register',
    link: '/signup',
  },
  {
    image: '/images/hero2.png',
    title: 'Secure access',
    description:
      'Use your email and password to sign in. Your account is linked to the Beneficiary role in HWSETA systems.',
    button: 'Sign in',
    link: '/login',
  },
  {
    image: '/images/hero3.png',
    title: 'Your workspace',
    description:
      'Once signed in, you will land on a dedicated dashboard built for beneficiaries.',
    button: 'Register',
    link: '/signup',
  },
];

const Hero: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const length = slides.length;

  const nextSlide = useCallback(() => {
    setCurrent(current === length - 1 ? 0 : current + 1);
  }, [current, length]);

  const prevSlide = useCallback(() => {
    setCurrent(current === 0 ? length - 1 : current - 1);
  }, [current, length]);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        nextSlide();
      }, 5000); // Change slide every 5 seconds

      return () => clearInterval(interval);
    }
  }, [current, isPaused, nextSlide]);

  return (
    <section
      className="relative flex h-[64vh] w-full items-center overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            width={1920}
            height={800}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-slate-900/20" />
        </div>
      ))}
      {/* Content */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-4xl p-1 text-left text-white sm:p-2 md:p-3">
          <h1 className="text-4xl font-bold leading-[1.02] tracking-tight text-white drop-shadow-md sm:text-5xl md:text-6xl lg:text-7xl">
            Empowering Your Growth
          </h1>
          <p className="mb-7 mt-4 max-w-3xl text-base leading-relaxed sm:mb-8 sm:mt-5 sm:text-lg md:text-xl">
            <span className="text-white/80">Skills for the real world.</span>{' '}
            <span className="font-semibold text-hwseta-yellow drop-shadow-sm">Space to shine.</span>{' '}
            <span className="italic font-light tracking-wide text-white/95">
              Your future, your pace — we&apos;re rooting for you.
            </span>
          </p>
          <h2 className="mb-3 text-2xl font-bold leading-tight text-white/95 drop-shadow-sm transition-opacity duration-500 sm:text-3xl md:text-4xl">
            {slides[current].title}
          </h2>
          <p className="mb-8 max-w-3xl text-base text-slate-200/95 sm:text-lg md:text-xl">
            {slides[current].description}
          </p>
          <Link
            href={slides[current].link}
            className="inline-flex items-center gap-2 rounded-full bg-hwseta-green px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-hwseta-green-dark"
          >
            {slides[current].button}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2.5 sm:p-3 z-30 transition"
        aria-label="Previous Slide"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2.5 sm:p-3 z-30 transition"
        aria-label="Next Slide"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      {/* Navigation Indicators */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-30">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-1.5 rounded-full transition-all ${current === idx ? 'w-8 bg-hwseta-yellow' : 'w-1.5 bg-white/50 hover:bg-white/70'} transition`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
