"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Users,
  Key,
  ShieldCheck,
  MapPin,
  Map,
  Building2,
  FileEdit,
  Activity,
  Settings,
  Landmark,
  UserCheck,
  ChevronRight,
  ChevronDown,
  Menu,
  Bell,
  ClipboardList,
  GitBranch,
  Folder,
  BarChart3,
  Cpu,
  Package,
  Search,
  LogOut
} from "lucide-react";
import { get } from "../../_lib/redux/services/apiClient";
import {
  fetchUserRolesPermissions,
  type UserRolesPermissionsResponse,
} from "../../_lib/redux/services/adminApi";
import { useOrgTheme } from "../../_hooks/useOrgTheme";
import { orgs, type OrgSlug } from "../../_config/orgs";
import styles from "./users/users.module.css";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { orgSlug } = useParams<{ orgSlug: string }>();

  // Ensure theme variables are applied
  useOrgTheme(orgSlug as string, true);

  const [authorized, setAuthorized] = useState(false);
  const [navPerms, setNavPerms] = useState<UserRolesPermissionsResponse | null>(
    null,
  );
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const checkedRef = useRef(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        router.push(`/${orgSlug}`);
        return;
      }

      const res = await get("/user");
      if (!res.ok) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("nav_permissions");
        router.push(`/${orgSlug}`);
        return;
      }

      await res.json();

      try {
        const rp = await fetchUserRolesPermissions();
        setNavPerms(rp);
        localStorage.setItem("nav_permissions", JSON.stringify(rp));
      } catch (err) {
        console.error("[RBAC] Failed to fetch /user/roles-permissions:", err);
        const cached = localStorage.getItem("nav_permissions");
        if (cached) {
          setNavPerms(JSON.parse(cached));
        }
      }

      setAuthorized(true);
    })();
  }, [router, orgSlug]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  function handleLogout() {
    setIsAccountMenuOpen(false);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("org_slug");
    localStorage.removeItem("nav_permissions");
    router.push(`/${orgSlug}`);
  }

  if (!authorized) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Authenticating…</p>
      </div>
    );
  }

  interface SidebarItem {
    href?: string;
    icon: React.ReactNode;
    label: string;
    module: string;
    alwaysShow?: boolean;
    hasChevron?: boolean;
    badge?: string;
    children?: Array<{ label: string; href: string }>;
  }

  const originalSidebarItems: SidebarItem[] = [
    {
      href: `/${orgSlug}/dashboard`,
      icon: <LayoutDashboard size={18} />,
      label: "Dashboard",
      module: "dashboard",
      alwaysShow: true,
    },
    {
      href: `/${orgSlug}/applications`,
      icon: <FileText size={18} />,
      label: "Applications",
      module: "reports",
      alwaysShow: true,
    },
    {
      href: `/${orgSlug}/users`,
      icon: <Users size={18} />,
      label: "Users",
      module: "users",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/roles`,
      icon: <Key size={18} />,
      label: "Roles",
      module: "roles",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/permissions`,
      icon: <ShieldCheck size={18} />,
      label: "Permissions",
      module: "permissions",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/regions`,
      icon: <MapPin size={18} />,
      label: "Regions",
      module: "regions",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/sub-regions`,
      icon: <Map size={18} />,
      label: "Sub Regions",
      module: "sub_regions",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/branches`,
      icon: <Building2 size={18} />,
      label: "Branches",
      module: "branches",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/maker-requests`,
      icon: <FileEdit size={18} />,
      label: "Maker Requests",
      module: "maker_requests",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/app-statuses`,
      icon: <Activity size={18} />,
      label: "Statuses",
      module: "app_statuses",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/master-values`,
      icon: <Settings size={18} />,
      label: "Master Values",
      module: "master_values",
      alwaysShow: false,
    },
    {
      href: `/${orgSlug}/product-config`,
      icon: <Landmark size={18} />,
      label: "Loan Products",
      module: "loan-products",
      alwaysShow: false,
    },
  ];

  // RBAC filter logic
  const activeNavItems = (() => {
    if (navPerms?.is_super_admin) {
      return originalSidebarItems.filter(item => 
        item.module !== "regions" && 
        item.module !== "sub_regions" && 
        item.module !== "app_statuses"
      );
    }

    if (!navPerms) return originalSidebarItems.filter((item) => item.alwaysShow);

    const perms = navPerms.permissions;
    if (!perms.length) return originalSidebarItems.filter((item) => item.alwaysShow);
    if (perms.includes("*")) return originalSidebarItems;

    return originalSidebarItems.filter((item) => {
      if (item.alwaysShow) return true;
      return perms.some((p) => p.startsWith(item.module + "."));
    });
  })();

  const isActive = (href: string) => {
    if (!pathname) return false;
    const hrefWithoutSlug = href.replace(`/${orgSlug}`, "") || "/";
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname === hrefWithoutSlug ||
      pathname.startsWith(`${hrefWithoutSlug}/`)
    );
  };

  const currentOrgName = "LOS360";
  const brandLogo = "/images/LOS360-logo.png";

  // Breadcrumb dynamic title
  let breadcrumbTitle = "Applications";
  if (pathname.includes("/dashboard")) breadcrumbTitle = "Dashboard";
  else if (pathname.includes("/users")) breadcrumbTitle = "Users";
  else if (pathname.includes("/roles")) breadcrumbTitle = "Roles";
  else if (pathname.includes("/permissions")) breadcrumbTitle = "Permissions";
  else if (pathname.includes("/regions")) breadcrumbTitle = "Regions";
  else if (pathname.includes("/sub-regions")) breadcrumbTitle = "Sub Regions";
  else if (pathname.includes("/branches")) breadcrumbTitle = "Branches";
  else if (pathname.includes("/maker-requests")) breadcrumbTitle = "Maker Requests";
  else if (pathname.includes("/app-statuses")) breadcrumbTitle = "Statuses";
  else if (pathname.includes("/master-values")) breadcrumbTitle = "Master Values";
  else if (pathname.includes("/product-config")) breadcrumbTitle = "Loan Products";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans antialiased text-[#1E293B]">
      {/* Sidebar Section */}
      <aside className={`${isSidebarCollapsed ? "w-[76px]" : "w-[252px]"} bg-white border-r border-[#E2E8F0] flex flex-col sticky top-0 h-screen shrink-0 z-20 transition-[width] duration-300 ease-in-out`}>
        {/* Logo area */}
        <div className={`${isSidebarCollapsed ? "px-3 justify-center" : "px-5 justify-between"} h-[70px] border-b border-[#E2E8F0] flex items-center transition-all duration-300`}>
          <Link href={`/${orgSlug}/dashboard`} className={`${isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100"} flex min-w-0 items-center gap-2.5 overflow-hidden decoration-transparent transition-all duration-200`}>
            <Image src={brandLogo} alt={currentOrgName} width={130} height={32} className="h-8 max-w-[130px] object-contain" priority />
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-all hover:bg-[#F8FAFC] hover:text-[#1E293B] cursor-pointer"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={20} className={`transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className={`${isSidebarCollapsed ? "px-3" : "px-4"} flex-1 py-6 overflow-y-auto space-y-1 scrollbar-none transition-all duration-300`}>
          {activeNavItems.map((item) => {
            const isItemActive = isActive(item.href || "");
            const hasSubmenu = !!item.children;

            if (hasSubmenu) {
              const isAnyChildActive = item.children?.some(child => isActive(child.href)) ?? false;
              return (
                <div key={item.label} className="space-y-1">
                  <div
                    className={`flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-between px-3"} py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isAnyChildActive
                        ? "bg-[#F5F3FF] text-[#5F39F8]"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                      <span className={isAnyChildActive ? "text-[#5F39F8]" : "text-[#94A3B8]"}>{item.icon}</span>
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isSidebarCollapsed && <ChevronDown size={16} className={isAnyChildActive ? "text-[#5F39F8]" : "text-[#94A3B8]"} />}
                  </div>
                  {/* Expanded submenu items */}
                  {!isSidebarCollapsed && <div className="pl-9 space-y-1 border-l-2 border-[#F3E8FF] ml-5 mt-1">
                    {item.children?.map((child) => {
                      const isChildActive = child.label === "All Applications" && pathname.endsWith("/applications"); // force active All Applications
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`flex items-center gap-2.5 py-2 text-xs font-semibold rounded decoration-transparent ${
                            isChildActive
                              ? "text-[#5F39F8]"
                              : "text-[#64748B] hover:text-[#1E293B]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isChildActive ? "bg-[#5F39F8]" : "border border-[#94A3B8]"
                            }`}
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`flex items-center ${isSidebarCollapsed ? "justify-center px-0" : "justify-between px-3"} py-2.5 rounded-lg text-sm font-medium transition-all decoration-transparent ${
                  isItemActive
                    ? "bg-[#F5F3FF] text-[#5F39F8]"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
                }`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                  <span className={isItemActive ? "text-[#5F39F8]" : "text-[#94A3B8]"}>{item.icon}</span>
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </div>
                {!isSidebarCollapsed && item.hasChevron && <ChevronRight size={16} className="text-[#94A3B8]" />}
                {!isSidebarCollapsed && item.badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#F5F3FF] text-[#5F39F8]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className={`${isSidebarCollapsed ? "justify-center px-0" : "justify-start px-3"} w-full flex items-center gap-2.5 py-2 text-xs font-bold text-[#64748B] hover:text-[#1E293B] cursor-pointer transition-all`}
            title={isSidebarCollapsed ? "Expand Menu" : "Collapse Menu"}
          >
            <ChevronRight size={16} className={`transition-transform duration-300 ${isSidebarCollapsed ? "" : "rotate-180"}`} />
            {!isSidebarCollapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Header */}
        <header className="h-[70px] bg-white border-b border-[#E2E8F0] px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
            <Link href={`/${orgSlug}/applications`} className="hover:text-[#1E293B] decoration-transparent font-semibold">
              Loan Applications
            </Link>
            <ChevronRight size={12} className="text-[#94A3B8]" />
            <span className="text-[#1E293B] font-semibold">{breadcrumbTitle}</span>
          </div>

          {/* Search bar inside header */}
          <div className="relative w-80 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search applications, customers, loans..."
              className="w-full h-9 pl-9 pr-14 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-full focus:outline-none focus:border-[#5F39F8] focus:bg-white transition-all font-medium"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#94A3B8] border border-[#E2E8F0] px-1.5 py-0.5 rounded bg-white select-none">
              Ctrl /
            </span>
          </div>

          {/* Profile options */}
          <div className="flex items-center gap-5">
            {/* Bell notification */}
            <button className="relative p-2 text-[#64748B] hover:text-[#1E293B] rounded-full hover:bg-[#F8FAFC] cursor-pointer transition-all">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#5F39F8] text-[9px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white">
                12
              </span>
            </button>

            {/* Profile Avatar & Details */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-xl pl-4 pr-2 py-1.5 border-l border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#5F39F8] text-white flex items-center justify-center font-bold text-sm">
                  AS
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-[#1E293B] leading-none">Arjun Singh</div>
                  <div className="text-[10px] text-[#64748B] font-medium mt-0.5">Super Admin</div>
                </div>
                <ChevronDown size={14} className={`text-[#64748B] transition-transform duration-200 ${isAccountMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-[#F1F5F9]">
                    <div className="text-xs font-extrabold text-[#1E293B]">Arjun Singh</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-[#64748B]">Super Admin</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-extrabold text-[#EF4444] transition-all hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

