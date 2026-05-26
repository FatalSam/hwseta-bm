'use client';

import { Fragment, useState, useEffect, useCallback, type ComponentType, type SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Dialog, Transition } from "@headlessui/react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Bars3Icon,
  HomeIcon,
  XMarkIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  AcademicCapIcon,
  InboxIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  BookOpenIcon,
  BuildingOffice2Icon,
  PresentationChartLineIcon,
  DocumentMagnifyingGlassIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { LifeBuoy, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getMyBeneficiaryProfile } from "@/api/beneficiaryProfile";
import { getUserRoleFromToken, isAdminRole, isBeneficiaryRole } from "@/lib/jwt-utils";
import DashboardHeader from "./dashboard-header";
import { DashboardFooter } from "./dashboard-footer";
import type { BeneficiaryProfileRecord } from "@/types/beneficiaryProfile";

const SIDEBAR_COLLAPSED_KEY = "hwseta-beneficiary-sidebar-collapsed";

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const YearDisplay = () => {
  const [year, setYear] = useState('');
  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);
  return <>{year}</>;
};

const BENEFICIARY_HOME = '/dashboard/beneficiary';
const BENEFICIARY_PROFILE = '/dashboard/beneficiary/profile';
const BENEFICIARY_PROGRAMMES = '/dashboard/beneficiary/programmes';
const BENEFICIARY_FEEDBACK_FORMS = '/dashboard/beneficiary/feedback-forms';
const BENEFICIARY_COMPLAINTS = '/dashboard/beneficiary/complaints';
const BENEFICIARY_COMMUNICATION = '/dashboard/beneficiary/communication';
const BENEFICIARY_COMMUNICATION_SMS = `${BENEFICIARY_COMMUNICATION}/sms`;
const BENEFICIARY_COMMUNICATION_EMAIL = `${BENEFICIARY_COMMUNICATION}/email`;
const BENEFICIARY_SUPPORT = '/dashboard/beneficiary/support';
const BENEFICIARY_PROFILE_SAVED_EVENT = 'hwseta:beneficiary-profile-saved';

const ADMIN_BASE = '/dashboard/admin';
const ADMIN_BENEFICIARIES = `${ADMIN_BASE}/beneficiaries`;
const ADMIN_PROGRAMME_ENROLMENTS = `${ADMIN_BASE}/programme-enrolments`;
const ADMIN_TRAINING_PROVIDERS = `${ADMIN_BASE}/training-providers`;
const ADMIN_EMPLOYERS = `${ADMIN_BASE}/employers`;
const ADMIN_FORM_BUILDER = `${ADMIN_BASE}/form-builder`;
const ADMIN_FORM_SUBMISSIONS = `${ADMIN_BASE}/form-submissions`;
const ADMIN_COMPLAINTS = `${ADMIN_BASE}/complaints`;
const ADMIN_SETUP_BASE = `${ADMIN_BASE}/setup`;
const ADMIN_SETUP_PROGRAMMES_SETUP = `${ADMIN_SETUP_BASE}/programmes-setup`;
const ADMIN_SETUP_SMS_EMAIL_SETTINGS = `${ADMIN_SETUP_BASE}/sms-email-settings`;

const REPORTS_BASE = '/dashboard/reports';
const REPORTS_BENEFICIARY_PROFILES = `${REPORTS_BASE}/beneficiary-profiles`;

function hasBeneficiaryProfile(profile: BeneficiaryProfileRecord | undefined): boolean {
  if (!profile || typeof profile !== 'object') return false;
  const record = profile as Record<string, unknown>;
  const id = record.beneficiaryId ?? record.BeneficiaryId ?? record.BeneficiaryID;
  return id != null && String(id).trim().length > 0;
}

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [adminSetupOpen, setAdminSetupOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const token = useAuthStore((s) => s.token);
  const role = getUserRoleFromToken(token);
  const showAdminNav = isAdminRole(role);
  const showBeneficiaryNav = isBeneficiaryRole(role) && !showAdminNav;
  const beneficiaryProfileQuery = useQuery({
    queryKey: ['beneficiary-profile', 'sidebar-gate'],
    queryFn: getMyBeneficiaryProfile,
    enabled: showBeneficiaryNav,
    retry: false,
  });
  const { refetch: refetchBeneficiaryProfile } = beneficiaryProfileQuery;
  const beneficiaryProfileExists = !showBeneficiaryNav || hasBeneficiaryProfile(beneficiaryProfileQuery.data);
  const beneficiaryNavLocked = showBeneficiaryNav && !beneficiaryProfileExists;

  useEffect(() => {
    try {
      setDesktopCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setSidebarReady(true);
  }, []);

  useEffect(() => {
    if (pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`)) {
      setAdminOpen(true);
    } else {
      setAdminOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith(`${REPORTS_BASE}/`)) {
      setReportsOpen(true);
    } else {
      setReportsOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith(`${ADMIN_SETUP_BASE}/`)) {
      setAdminSetupOpen(true);
    } else {
      setAdminSetupOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (
      pathname.startsWith(`${ADMIN_FORM_BUILDER}/`) ||
      pathname === ADMIN_FORM_BUILDER ||
      pathname.startsWith(`${ADMIN_FORM_SUBMISSIONS}/`) ||
      pathname === ADMIN_FORM_SUBMISSIONS
    ) {
      setFormsOpen(true);
    } else {
      setFormsOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!showBeneficiaryNav) return;
    const onProfileSaved = () => {
      refetchBeneficiaryProfile();
    };
    window.addEventListener(BENEFICIARY_PROFILE_SAVED_EVENT, onProfileSaved);
    return () => window.removeEventListener(BENEFICIARY_PROFILE_SAVED_EVENT, onProfileSaved);
  }, [refetchBeneficiaryProfile, showBeneficiaryNav]);

  useEffect(() => {
    if (!beneficiaryNavLocked || beneficiaryProfileQuery.isLoading) return;
    const allowed =
      pathname === BENEFICIARY_HOME ||
      pathname === BENEFICIARY_PROFILE ||
      pathname.startsWith(`${BENEFICIARY_PROFILE}/`) ||
      pathname === BENEFICIARY_SUPPORT ||
      pathname.startsWith(`${BENEFICIARY_SUPPORT}/`);
    if (!allowed) {
      router.replace(BENEFICIARY_PROFILE);
    }
  }, [beneficiaryNavLocked, beneficiaryProfileQuery.isLoading, pathname, router]);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  const navLinkClass = (href: string, collapsed: boolean, options?: { exact?: boolean }) => {
    const exact = options?.exact !== false;
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return classNames(
      "group relative flex items-center gap-3 rounded-lg text-sm font-semibold transition-all duration-200",
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
      active
        ? "bg-white text-hwseta-green-dark shadow-sm ring-1 ring-slate-200/80 before:absolute before:left-0 before:top-1/2 before:h-7 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-hwseta-yellow"
        : "text-slate-600 hover:bg-white/90 hover:text-hwseta-green-dark hover:shadow-sm",
    );
  };

  const logoutClass = (collapsed: boolean) =>
    classNames(
      "group flex w-full items-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 text-sm font-semibold text-red-800 shadow-sm transition-all duration-200",
      "hover:border-red-400 hover:bg-red-100 hover:text-red-900 hover:shadow-md",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc]",
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
    );

  const disabledNavClass = (collapsed: boolean) =>
    classNames(
      "group flex w-full items-center gap-3 rounded-lg text-sm font-semibold text-slate-400 opacity-55",
      "cursor-not-allowed bg-slate-50/70",
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
    );

  const profileLockedTitle = "Complete My Profile to unlock this menu item.";

  const renderDisabledBeneficiaryItem = (
    label: string,
    Icon: ComponentType<SVGProps<SVGSVGElement>>,
    collapsed: boolean,
  ) => (
    <button
      type="button"
      disabled
      className={disabledNavClass(collapsed)}
      aria-label={collapsed ? `${label} locked until profile is completed` : undefined}
      title={profileLockedTitle}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
      {!collapsed && <span>{label}</span>}
    </button>
  );

  const renderSidebarNav = (
    collapsed: boolean,
    options?: { showDesktopCollapse?: boolean; instance?: 'drawer' | 'desktop' },
  ) => {
    const showDesktopCollapse = options?.showDesktopCollapse === true;
    const navInstance = options?.instance ?? 'drawer';
    const commTriggerId = `sidebar-communication-trigger-${navInstance}`;
    const commSubmenuId = `sidebar-communication-submenu-${navInstance}`;
    const adminTriggerId = `sidebar-admin-trigger-${navInstance}`;
    const adminSubmenuId = `sidebar-admin-submenu-${navInstance}`;
    const reportsTriggerId = `sidebar-reports-trigger-${navInstance}`;
    const reportsSubmenuId = `sidebar-reports-submenu-${navInstance}`;
    const adminSetupTriggerId = `sidebar-admin-setup-trigger-${navInstance}`;
    const adminSetupSubmenuId = `sidebar-admin-setup-submenu-${navInstance}`;
    const adminFormsTriggerId = `sidebar-admin-forms-trigger-${navInstance}`;
    const adminFormsSubmenuId = `sidebar-admin-forms-submenu-${navInstance}`;
    const formsNavActive =
      pathname === ADMIN_FORM_BUILDER ||
      pathname.startsWith(`${ADMIN_FORM_BUILDER}/`) ||
      pathname === ADMIN_FORM_SUBMISSIONS ||
      pathname.startsWith(`${ADMIN_FORM_SUBMISSIONS}/`);
    return (
    <>
      <div
        className={classNames(
          "mb-5 shrink-0 transition-all duration-300",
          collapsed ? "mt-2 flex flex-col items-center" : "mt-4",
        )}
      >
        <Link
          href="/"
          className={classNames(
            "block transition-all duration-300",
            collapsed ? "w-full max-w-full" : "w-full max-w-[272px]",
          )}
        >
          <Image
            src="/images/hwseta-logo.png"
            alt="HWSETA"
            width={640}
            height={192}
            quality={100}
            sizes={collapsed ? "64px" : "272px"}
            className={classNames(
              "w-full object-contain object-left transition-all duration-300",
              collapsed ? "max-h-[3.25rem]" : "h-auto",
            )}
          />
          {!collapsed && (
            <span className="mt-2.5 block text-center text-[0.65rem] font-bold uppercase tracking-[0.14em] text-hwseta-green-dark">
              {showAdminNav ? "Admin Hub" : "Beneficiary Hub"}
            </span>
          )}
        </Link>
      </div>

      <ul role="list" className="flex flex-1 flex-col gap-y-2">
        {showDesktopCollapse && (
          <li className="shrink-0">
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className={classNames(
                "group flex w-full items-center rounded-lg text-slate-400 transition-colors duration-150",
                "hover:bg-slate-100/60 hover:text-hwseta-green",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-hwseta-green/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[#f8fafc]",
                collapsed ? "justify-center px-1 py-1" : "justify-between gap-2 px-2 py-1",
              )}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {!collapsed && (
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-600">Collapse</span>
              )}
              <ChevronLeftIcon
                className={classNames(
                  "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 group-hover:opacity-100",
                  collapsed && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </li>
        )}
        <li>
          <ul className="space-y-1">
            {showBeneficiaryNav && (
              <>
            <li>
              <Link
                href={BENEFICIARY_HOME}
                className={navLinkClass(BENEFICIARY_HOME, collapsed, { exact: true })}
                aria-label={collapsed ? "Dashboard" : undefined}
              >
                <HomeIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link
                href={BENEFICIARY_PROFILE}
                className={navLinkClass(BENEFICIARY_PROFILE, collapsed)}
                aria-label={collapsed ? "My Profile" : undefined}
              >
                <UserCircleIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                {!collapsed && <span>My Profile</span>}
              </Link>
            </li>
            <li>
              {beneficiaryNavLocked ? (
                renderDisabledBeneficiaryItem("Programmes", AcademicCapIcon, collapsed)
              ) : (
                <Link
                  href={BENEFICIARY_PROGRAMMES}
                  className={navLinkClass(BENEFICIARY_PROGRAMMES, collapsed)}
                  aria-label={collapsed ? "Programmes" : undefined}
                >
                  <AcademicCapIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                  {!collapsed && <span>Programmes</span>}
                </Link>
              )}
            </li>
            <li>
              {beneficiaryNavLocked ? (
                renderDisabledBeneficiaryItem("Feedback Forms", ClipboardDocumentListIcon, collapsed)
              ) : (
                <Link
                  href={BENEFICIARY_FEEDBACK_FORMS}
                  className={navLinkClass(BENEFICIARY_FEEDBACK_FORMS, collapsed)}
                  aria-label={collapsed ? "Feedback Forms" : undefined}
                >
                  <ClipboardDocumentListIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                  {!collapsed && <span>Feedback Forms</span>}
                </Link>
              )}
            </li>
            <li>
              {beneficiaryNavLocked ? (
                renderDisabledBeneficiaryItem("Complaints", ExclamationTriangleIcon, collapsed)
              ) : (
                <Link
                  href={BENEFICIARY_COMPLAINTS}
                  className={navLinkClass(BENEFICIARY_COMPLAINTS, collapsed)}
                  aria-label={collapsed ? "Complaints" : undefined}
                >
                  <ExclamationTriangleIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                  {!collapsed && <span>Complaints</span>}
                </Link>
              )}
            </li>
            <li className="space-y-1">
              <div
                id={commTriggerId}
                role="group"
                aria-label="Communication"
                title={beneficiaryNavLocked ? profileLockedTitle : undefined}
                className={classNames(
                  "flex w-full items-center rounded-lg text-sm font-semibold",
                  collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2.5",
                  beneficiaryNavLocked
                    ? "cursor-not-allowed bg-slate-50/70 text-slate-400 opacity-55"
                    : pathname.startsWith(`${BENEFICIARY_COMMUNICATION}/`)
                    ? "bg-emerald-50/90 text-hwseta-green-dark ring-1 ring-hwseta-green/15"
                    : "text-slate-600",
                )}
              >
                <span className={classNames("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
                  <InboxIcon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                  {!collapsed && <span>Communication</span>}
                </span>
              </div>
              <ul
                id={commSubmenuId}
                role="list"
                className={classNames(
                  "space-y-1 border-l-2 border-hwseta-green/45",
                  collapsed ? "ml-1 flex flex-col items-stretch py-0.5 pl-2" : "ml-3 py-0.5 pl-3",
                )}
                aria-labelledby={commTriggerId}
              >
                <li>
                  {beneficiaryNavLocked ? (
                    renderDisabledBeneficiaryItem("SMS", ChatBubbleLeftRightIcon, collapsed)
                  ) : (
                    <Link
                      href={BENEFICIARY_COMMUNICATION_SMS}
                      className={navLinkClass(BENEFICIARY_COMMUNICATION_SMS, collapsed, { exact: true })}
                      aria-label={collapsed ? "SMS" : undefined}
                    >
                      <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>SMS</span>}
                    </Link>
                  )}
                </li>
                <li>
                  {beneficiaryNavLocked ? (
                    renderDisabledBeneficiaryItem("Emails", EnvelopeIcon, collapsed)
                  ) : (
                    <Link
                      href={BENEFICIARY_COMMUNICATION_EMAIL}
                      className={navLinkClass(BENEFICIARY_COMMUNICATION_EMAIL, collapsed, { exact: true })}
                      aria-label={collapsed ? "Emails" : undefined}
                    >
                      <EnvelopeIcon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Emails</span>}
                    </Link>
                  )}
                </li>
              </ul>
            </li>
            <li>
              <Link
                href={BENEFICIARY_SUPPORT}
                className={navLinkClass(BENEFICIARY_SUPPORT, collapsed)}
                aria-label={collapsed ? "Support" : undefined}
              >
                <LifeBuoy className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" aria-hidden />
                {!collapsed && <span>Support</span>}
              </Link>
            </li>
              </>
            )}
            {showAdminNav && (
              <>
            <li className="space-y-1">
              <button
                type="button"
                id={adminTriggerId}
                aria-expanded={adminOpen}
                aria-controls={adminSubmenuId}
                onClick={() => setAdminOpen((o) => !o)}
                className={classNames(
                  "group flex w-full items-center rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-hwseta-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc]",
                  collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2 px-3 py-2.5",
                  pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`)
                    ? "bg-emerald-50/90 text-hwseta-green-dark ring-1 ring-hwseta-green/15"
                    : "text-slate-600 hover:bg-white/90 hover:text-hwseta-green-dark hover:shadow-sm",
                )}
              >
                <span className={classNames("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
                  <ShieldCheckIcon className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-600" aria-hidden />
                  {!collapsed && <span className="text-slate-800">Admin</span>}
                </span>
                {!collapsed && (
                  <ChevronDownIcon
                    className={classNames(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600",
                      adminOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                )}
              </button>
              {adminOpen && (
                <ul
                  id={adminSubmenuId}
                  role="list"
                  className={classNames(
                    "space-y-1 border-l-2 border-hwseta-green/45",
                    collapsed ? "ml-1 flex flex-col items-stretch py-0.5 pl-2" : "ml-3 py-0.5 pl-3",
                  )}
                  aria-labelledby={adminTriggerId}
                >
                  <li>
                    <Link
                      href={ADMIN_BASE}
                      className={navLinkClass(ADMIN_BASE, collapsed, { exact: true })}
                      aria-label={collapsed ? "Admin dashboard" : undefined}
                    >
                      <Squares2X2Icon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Dashboard</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={ADMIN_BENEFICIARIES}
                      className={classNames(navLinkClass(ADMIN_BENEFICIARIES, collapsed, { exact: true }), !collapsed && "font-semibold")}
                      aria-label={collapsed ? "Beneficiaries" : undefined}
                    >
                      <UserGroupIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Beneficiaries</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={ADMIN_PROGRAMME_ENROLMENTS}
                      className={navLinkClass(ADMIN_PROGRAMME_ENROLMENTS, collapsed, { exact: true })}
                      aria-label={collapsed ? "Programme Enrolments" : undefined}
                    >
                      <AcademicCapIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Programme Enrolments</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={ADMIN_TRAINING_PROVIDERS}
                      className={navLinkClass(ADMIN_TRAINING_PROVIDERS, collapsed, { exact: true })}
                      aria-label={collapsed ? "Training Providers" : undefined}
                    >
                      <BookOpenIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Training Providers</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={ADMIN_EMPLOYERS}
                      className={navLinkClass(ADMIN_EMPLOYERS, collapsed, { exact: true })}
                      aria-label={collapsed ? "Employers" : undefined}
                    >
                      <BuildingOffice2Icon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Employers</span>}
                    </Link>
                  </li>
                  <li className="space-y-1">
                    <button
                      type="button"
                      id={adminFormsTriggerId}
                      data-nav-section="admin-forms"
                      aria-expanded={formsOpen}
                      aria-controls={adminFormsSubmenuId}
                      aria-label={collapsed ? "Forms" : undefined}
                      onClick={() => setFormsOpen((o) => !o)}
                      className={classNames(
                        "group relative flex w-full items-center rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-hwseta-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc]",
                        collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2 px-3 py-2.5",
                        formsNavActive
                          ? "bg-white text-hwseta-green-dark shadow-sm ring-1 ring-slate-200/80 before:absolute before:left-0 before:top-1/2 before:h-7 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-hwseta-yellow"
                          : "text-slate-600 hover:bg-white/90 hover:text-hwseta-green-dark hover:shadow-sm",
                      )}
                    >
                      <span className={classNames("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
                        <ClipboardDocumentListIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                        {!collapsed && <span>Forms</span>}
                      </span>
                      {!collapsed && (
                        <ChevronDownIcon
                          className={classNames(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600",
                            formsOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      )}
                    </button>
                    {formsOpen && (
                      <ul
                        id={adminFormsSubmenuId}
                        role="list"
                        className={classNames(
                          "space-y-1 border-l-2 border-hwseta-green/35",
                          collapsed ? "ml-1 flex flex-col items-stretch py-0.5 pl-2" : "ml-3 py-0.5 pl-3",
                        )}
                        aria-labelledby={adminFormsTriggerId}
                      >
                        <li>
                          <Link
                            href={ADMIN_FORM_BUILDER}
                            data-nav-item="forms-builder"
                            className={navLinkClass(ADMIN_FORM_BUILDER, collapsed, { exact: false })}
                            aria-label={collapsed ? "Builder" : undefined}
                          >
                            <PencilSquareIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                            {!collapsed && <span>Builder</span>}
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={ADMIN_FORM_SUBMISSIONS}
                            data-nav-item="forms-submissions"
                            className={navLinkClass(ADMIN_FORM_SUBMISSIONS, collapsed, { exact: false })}
                            aria-label={collapsed ? "Submissions" : undefined}
                          >
                            <InboxIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                            {!collapsed && <span>Submissions</span>}
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                  <li>
                    <Link
                      href={ADMIN_COMPLAINTS}
                      className={navLinkClass(ADMIN_COMPLAINTS, collapsed, { exact: true })}
                      aria-label={collapsed ? "Complaints" : undefined}
                    >
                      <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Complaints</span>}
                    </Link>
                  </li>
                  <li className="space-y-1">
                    <button
                      type="button"
                      id={adminSetupTriggerId}
                      aria-expanded={adminSetupOpen}
                      aria-controls={adminSetupSubmenuId}
                      aria-label={collapsed ? "Set up" : undefined}
                      onClick={() => setAdminSetupOpen((o) => !o)}
                      className={classNames(
                        "group relative flex w-full items-center rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-hwseta-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc]",
                        collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2 px-3 py-2.5",
                        pathname.startsWith(`${ADMIN_SETUP_BASE}/`)
                          ? "bg-white text-hwseta-green-dark shadow-sm ring-1 ring-slate-200/80 before:absolute before:left-0 before:top-1/2 before:h-7 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-hwseta-yellow"
                          : "text-slate-600 hover:bg-white/90 hover:text-hwseta-green-dark hover:shadow-sm",
                      )}
                    >
                      <span className={classNames("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
                        <Cog6ToothIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                        {!collapsed && <span>Set Up</span>}
                      </span>
                      {!collapsed && (
                        <ChevronDownIcon
                          className={classNames(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600",
                            adminSetupOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      )}
                    </button>
                    {adminSetupOpen && (
                      <ul
                        id={adminSetupSubmenuId}
                        role="list"
                        className={classNames(
                          "space-y-1 border-l-2 border-hwseta-green/35",
                          collapsed ? "ml-1 flex flex-col items-stretch py-0.5 pl-2" : "ml-3 py-0.5 pl-3",
                        )}
                        aria-labelledby={adminSetupTriggerId}
                      >
                        <li>
                          <Link
                            href={ADMIN_SETUP_PROGRAMMES_SETUP}
                            className={navLinkClass(ADMIN_SETUP_PROGRAMMES_SETUP, collapsed, { exact: true })}
                            aria-label={collapsed ? "Programmes Setup" : undefined}
                          >
                            <AdjustmentsHorizontalIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                            {!collapsed && <span>Programmes Setup</span>}
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={ADMIN_SETUP_SMS_EMAIL_SETTINGS}
                            className={navLinkClass(ADMIN_SETUP_SMS_EMAIL_SETTINGS, collapsed, { exact: true })}
                            aria-label={collapsed ? "SMS & Email Settings" : undefined}
                          >
                            <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                            {!collapsed && <span>SMS &amp; Email Settings</span>}
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                </ul>
              )}
            </li>
            <li className="space-y-1">
              {!collapsed && (
                <p className="px-3 pb-1 pt-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Reports
                </p>
              )}
              <button
                type="button"
                id={reportsTriggerId}
                aria-expanded={reportsOpen}
                aria-controls={reportsSubmenuId}
                onClick={() => setReportsOpen((o) => !o)}
                className={classNames(
                  "group flex w-full items-center rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-hwseta-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc]",
                  collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2 px-3 py-2.5",
                  pathname.startsWith(`${REPORTS_BASE}/`)
                    ? "bg-emerald-50/90 text-hwseta-green-dark ring-1 ring-hwseta-green/15"
                    : "text-slate-600 hover:bg-white/90 hover:text-hwseta-green-dark hover:shadow-sm",
                )}
              >
                <span className={classNames("flex min-w-0 items-center gap-3", collapsed && "justify-center")}>
                  <PresentationChartLineIcon className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-600" aria-hidden />
                  {!collapsed && <span className="text-slate-800">Reports</span>}
                </span>
                {!collapsed && (
                  <ChevronDownIcon
                    className={classNames(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600",
                      reportsOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                )}
              </button>
              {reportsOpen && (
                <ul
                  id={reportsSubmenuId}
                  role="list"
                  className={classNames(
                    "space-y-1 border-l-2 border-hwseta-green/45",
                    collapsed ? "ml-1 flex flex-col items-stretch py-0.5 pl-2" : "ml-3 py-0.5 pl-3",
                  )}
                  aria-labelledby={reportsTriggerId}
                >
                  <li>
                    <Link
                      href={REPORTS_BENEFICIARY_PROFILES}
                      className={navLinkClass(REPORTS_BENEFICIARY_PROFILES, collapsed, { exact: true })}
                      aria-label={collapsed ? "Beneficiary Profiles" : undefined}
                    >
                      <DocumentMagnifyingGlassIcon className="h-5 w-5 shrink-0 text-slate-500 opacity-90 group-hover:opacity-100" aria-hidden />
                      {!collapsed && <span>Beneficiary Profiles</span>}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
              </>
            )}
          </ul>
        </li>
        <li className="pt-2">
          <button type="button" onClick={handleSignOut} className={logoutClass(collapsed)} aria-label="Log out">
            <LogOut className="h-5 w-5 shrink-0 text-red-600 group-hover:text-red-800" aria-hidden />
            {!collapsed && <span className="tracking-wide">Logout</span>}
          </button>
        </li>
        <li className="mt-auto pt-6">
          <div
            className={classNames(
              "border-t border-slate-200/90 transition-opacity duration-300",
              collapsed ? "pt-3 text-center" : "pt-4",
            )}
          >
            {!collapsed ? (
              <span className="text-[0.7rem] leading-relaxed text-slate-400">
                © <YearDisplay /> HWSETA
              </span>
            ) : (
              <span className="text-[0.65rem] font-medium text-slate-400" title="HWSETA">
                <span className="sr-only">© </span>
                <YearDisplay />
              </span>
            )}
          </div>
        </li>
      </ul>
    </>
    );
  };

  const desktopWidthClass = desktopCollapsed ? "lg:w-[5.25rem]" : "lg:w-72";
  const mainPadClass = desktopCollapsed ? "lg:pl-[5.25rem]" : "lg:pl-72";

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in duration-200 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-[280px] flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button
                        type="button"
                        className="-m-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:border-hwseta-green/30 hover:bg-emerald-50/80 hover:text-hwseta-green-dark"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="flex grow flex-col overflow-y-auto border-r border-slate-200/90 bg-gradient-to-b from-white via-emerald-50/35 to-slate-50 px-5 pb-6 pt-2 shadow-[4px_0_32px_-10px_rgba(15,23,42,0.08)]">
                    <nav className="flex flex-1 flex-col">{renderSidebarNav(false, { showDesktopCollapse: false, instance: 'drawer' })}</nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        <div
          className={classNames(
            "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col lg:transition-[width] lg:duration-300 lg:ease-out",
            sidebarReady ? desktopWidthClass : "lg:w-72",
          )}
        >
          <div className="flex grow flex-col overflow-x-hidden overflow-y-auto border-r border-slate-200/90 bg-gradient-to-b from-white via-emerald-50/35 to-slate-50 px-3 pb-6 shadow-[4px_0_28px_-8px_rgba(15,23,42,0.07)]">
            <nav className={classNames("flex flex-1 flex-col", desktopCollapsed ? "items-stretch" : "")}>
              {renderSidebarNav(desktopCollapsed, { showDesktopCollapse: true, instance: 'desktop' })}
            </nav>
          </div>
        </div>

        <div
          className={classNames(
            "transition-[padding] duration-300 ease-out",
            sidebarReady ? mainPadClass : "lg:pl-72",
          )}
        >
          <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-x-4 border-b border-hwseta-green/30 bg-gradient-to-r from-hwseta-green to-hwseta-green-dark px-4 shadow-sm sm:h-16 sm:px-6 lg:hidden">
            <span className="truncate text-sm font-semibold text-white sm:text-base">HWSETA Beneficiary Hub</span>
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-lg p-2.5 text-white/90 transition hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden />
            </button>
          </div>

          <main className="min-h-0">
            <DashboardHeader />
            {children}
            <DashboardFooter />
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
