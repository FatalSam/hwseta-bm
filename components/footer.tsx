'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';

const footerLinkClass = "text-slate-400 hover:text-hwseta-yellow transition-colors";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Link href="/" className="flex flex-col gap-3 w-fit max-w-full">
            <Image
              src="/images/hwseta-logo.png"
              alt="HWSETA — Health and Welfare Sector Education and Training Authority"
              width={840}
              height={252}
              quality={100}
              sizes="(max-width: 640px) 85vw, 320px"
              className="h-14 sm:h-16 md:h-[4.25rem] w-auto max-w-full object-contain object-left"
            />
            <span className="text-base sm:text-lg font-bold text-hwseta-yellow">HWSETA Beneficiary Hub</span>
          </Link>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Sign in to access your beneficiary dashboard and programme information.
          </p>
          <div className="flex gap-2">
            <a href="#" aria-label="Facebook" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-hwseta-green hover:text-white transition-colors">
              <FaFacebookF className="w-4 h-4" />
            </a>
            <a href="#" aria-label="Twitter" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-hwseta-green hover:text-white transition-colors">
              <FaTwitter className="w-4 h-4" />
            </a>
            <a href="#" aria-label="LinkedIn" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-hwseta-green hover:text-white transition-colors">
              <FaLinkedinIn className="w-4 h-4" />
            </a>
            <a href="#" aria-label="Instagram" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-hwseta-green hover:text-white transition-colors">
              <FaInstagram className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-hwseta-yellow mb-4">Get in touch</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="w-3 h-3 text-hwseta-yellow flex-shrink-0 mt-0.5" aria-hidden />
              <p className="text-slate-400">17 Bradford Road, Bedfordview, Johannesburg, 2047</p>
            </div>
            <div className="flex items-center gap-2">
              <FaPhone className="w-3 h-3 text-hwseta-yellow flex-shrink-0" aria-hidden />
              <a href="tel:0116076900" className={footerLinkClass}>0116076900</a>
            </div>
            <div className="flex items-center gap-2">
              <FaEnvelope className="w-3 h-3 text-hwseta-yellow flex-shrink-0" aria-hidden />
              <a href="mailto:hwseta@hwseta.org.za" className={footerLinkClass}>hwseta@hwseta.org.za</a>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-hwseta-yellow mb-4">Account</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className={footerLinkClass}>Home</Link></li>
            <li><Link href="/login" className={footerLinkClass}>Login</Link></li>
            <li><Link href="/signup" className={footerLinkClass}>Register</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 mt-12 pt-6">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} HWSETA Beneficiary Hub | All rights reserved.
        </p>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:border-hwseta-yellow hover:bg-hwseta-green/15 hover:text-hwseta-yellow transition-colors"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
