'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function About() {
    const [activeIndex, setActiveIndex] = useState(1);

    const tabContent: Record<number, string> = {
        1: "Our mission is to give beneficiaries a simple, secure entry point: register with verified details, sign in with email, and reach tools that support monitoring and compliance.",
        2: "We aim for a clear digital experience aligned with HWSETA processes so beneficiaries spend less time on admin and more time on their learning and development journey.",
        3: "We value clarity, security, and respect for your data. Authentication follows the HWSETA Beneficiary API rules for passwords and contact information.",
    };

    return (
        <section className="py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-stretch">
                    {/* Left: Image */}
                    <div className="relative w-full lg:w-1/2 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg border border-slate-100">
                        <Image
                            src="/images/thrive_biz_hub.webp"
                            alt="HWSETABeneficiaryHub team"
                            width={600}
                            height={400}
                            className="object-cover w-full h-full min-h-[280px] sm:min-h-[340px]"
                        />
                    </div>
                    {/* Right: Card with tabs */}
                    <div className="w-full lg:w-1/2">
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-hwseta-green-muted p-6 sm:p-8 h-full flex flex-col">
                            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-2">
                                About this portal
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-3">
                                Built for HWSETA beneficiaries
                            </h2>
                            <p className="text-slate-600 text-sm sm:text-base mb-6">
                                This site lets beneficiaries register and sign in against the HWSETA API, then opens a dedicated dashboard for monitoring and future programme tools.
                            </p>
                            <div className="flex flex-wrap gap-4 mb-6">
                                <a href="tel:0116076900" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-hwseta-green transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                    </svg>
                                    0116076900
                                </a>
                                <a href="mailto:hwseta@hwseta.org.za" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-hwseta-green transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                    hwseta@hwseta.org.za
                                </a>
                            </div>
                            {/* Tabs */}
                            <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-100 mb-4">
                                {([1, 2, 3] as const).map((idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setActiveIndex(idx)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition ${activeIndex === idx ? 'bg-white text-hwseta-green shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        {idx === 1 ? 'Mission' : idx === 2 ? 'Vision' : 'Values'}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-[88px]">
                                <p className="text-slate-600 text-sm leading-relaxed">{tabContent[activeIndex]}</p>
                            </div>
                            <Link
                                href="/signup"
                                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-hwseta-green hover:text-hwseta-green-dark"
                            >
                                Register as a beneficiary
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}