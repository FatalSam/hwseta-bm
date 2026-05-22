'use client';

import Image from "next/image";
import Link from "next/link";
import { UserPlus, LayoutDashboard, ShieldCheck } from "lucide-react";

const cards = [
  {
    title: "Register",
    description: "Create your beneficiary account with your name, email, phone, and a strong password.",
    href: "/signup",
    icon: UserPlus,
    image: "/images/feat1.webp",
  },
  {
    title: "Sign in",
    description: "Use your email as your username and your password to access the portal.",
    href: "/login",
    icon: ShieldCheck,
    image: "/images/feat2.webp",
  },
  {
    title: "Dashboard",
    description: "After login you are taken to your beneficiary dashboard for monitoring and updates.",
    href: "/dashboard/beneficiary",
    icon: LayoutDashboard,
    image: "/images/feat3.webp",
  },
];

export default function Features() {
  return (
    <section className="pt-12 sm:pt-14 pb-16 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-12 sm:mb-14 max-w-4xl text-center">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-hwseta-green mb-2">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight mb-3">
            Register, sign in, and open your dashboard
          </h2>
          <p className="mx-auto max-w-3xl text-slate-600 text-sm sm:text-base leading-relaxed">
            HWSETA Beneficiary Hub uses HWSETA authentication: register once, then sign in with your email.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-white rounded-2xl shadow-sm border border-hwseta-green-muted overflow-hidden hover:shadow-md hover:border-hwseta-green/25 transition-all flex flex-col"
            >
              <div className="relative w-full h-44 bg-slate-100">
                <Image
                  src={card.image}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                <div className="absolute bottom-3 left-4 p-2 rounded-full bg-hwseta-green text-white shadow-md">
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-hwseta-green-dark transition-colors">
                  {card.title}
                </h3>
                <p className="text-slate-600 text-sm flex-1">
                  {card.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-hwseta-green group-hover:gap-2 transition-all">
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
