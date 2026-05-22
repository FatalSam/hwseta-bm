'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const ABOUT_TABS = [
    {
        id: 'mission',
        label: 'Mission',
        content:
            'The Health and Welfare Sector Education and Training Authority (HWSETA) endeavours to create an integrated approach to the development and provision of appropriately skilled health and social development workers, to render quality services comparable to world class standards.',
    },
    {
        id: 'vision',
        label: 'Vision',
        content:
            'The creation of a skilled workforce for the health and social development needs of all South Africans.',
    },
    {
        id: 'credo',
        label: 'Our Credo',
        content:
            'That in meeting the needs of creating a skilled workforce for the health and social development sectors in South Africa, and all others who use our services, everything we do, consistently, must be high quality, within Ethical boundaries. This commitment extends to everything we do to bring our services to the people who use them.',
    },
    {
        id: 'values',
        label: 'Values',
        intro: 'The HWSETA holds dear the following core values:',
        items: [
            'Service Excellence',
            'Transformation',
            'Transparency',
            'Integrity',
            'Respect',
            'Fairness',
            'Accountability',
        ],
    },
] as const;

type AboutTabId = (typeof ABOUT_TABS)[number]['id'];

export default function About() {
    const [activeTab, setActiveTab] = useState<AboutTabId>('mission');
    const activeContent = ABOUT_TABS.find((tab) => tab.id === activeTab);

    return (
        <section className="pt-16 sm:pt-20 pb-12 sm:pb-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-stretch">
                    {/* Left: Image */}
                    <div className="relative w-full lg:w-1/2 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg border border-slate-100">
                        <Image
                            src="/images/about-beneficiaries.png"
                            alt="HWSETA beneficiaries at a programme workshop"
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
                                This platform enables beneficiaries to register and maintain their profiles, record programme participation, access messages, submit complaints, and complete surveys.
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
                            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-100 mb-4">
                                {ABOUT_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 min-w-[5.5rem] py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition ${activeTab === tab.id ? 'bg-white text-hwseta-green shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-[88px]">
                                {activeContent && 'content' in activeContent ? (
                                    <p className="text-slate-600 text-sm leading-relaxed">{activeContent.content}</p>
                                ) : activeContent && 'items' in activeContent ? (
                                    <div className="text-slate-600 text-sm leading-relaxed">
                                        <p>{activeContent.intro}</p>
                                        <ul className="mt-3 list-disc space-y-1 pl-5">
                                            {activeContent.items.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
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