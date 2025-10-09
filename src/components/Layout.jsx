import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useCart } from "../context/CartContext.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { ACCENT_COLOR } from "../data/productData.js";

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { count } = useCart();
  const navigate = useNavigate();
  const { token: adminToken, logout } = useAdminAuth();

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const previousOverflow =
      typeof document !== "undefined"
        ? document.body.style.overflow
        : undefined;
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (
        typeof document !== "undefined" &&
        typeof previousOverflow === "string"
      ) {
        document.body.style.overflow = previousOverflow;
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  const handleNavigateHome = () => {
    if (adminToken) {
      logout();
    }
    closeMenu();
  };

  const navLinks = [
    {
      label: "Startseite",
      to: "/",
      onClick: () => {
        if (adminToken) {
          logout();
        }
      },
    },
    { label: "Warenkorb", to: "/cart" },
    { label: "Admin", to: "/admin" },
  ];

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="relative mx-auto flex h-16 w-full max-w-screen-lg items-center px-4">
          <div className="flex flex-1 items-center">
            <button
              type="button"
              aria-label="Menü öffnen"
              aria-expanded={isMenuOpen}
              aria-controls="hauptmenue-panel"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-800 active:bg-gray-700"
            >
              <HamburgerIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
            <Link
              to="/"
              className="pointer-events-auto inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-800 active:bg-gray-700"
              onClick={handleNavigateHome}
            >
              <BrandIcon className="h-7 w-7" />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end">
            <Link
              to="/cart"
              aria-label="Warenkorb öffnen"
              className="relative inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-800 active:bg-gray-700"
            >
              <CartIcon className="h-6 w-6" />
              {count > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[rgb(204,31,47)] px-1 text-xs font-semibold text-white"
                  aria-label={`${count} Artikel im Warenkorb`}
                >
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
              role="presentation"
            />
            <motion.aside
              id="hauptmenue-panel"
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 border-r border-white/10 bg-gray-900/95 px-6 py-6 shadow-2xl shadow-black/60 backdrop-blur"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 42 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">Menü</span>
                <button
                  type="button"
                  aria-label="Menü schließen"
                  onClick={closeMenu}
                  className="rounded-md p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-3 text-base font-semibold text-white">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => {
                      if (typeof link.onClick === "function") {
                        link.onClick();
                      }
                      closeMenu();
                    }}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-[rgb(204,31,47)]/60 hover:bg-white/[0.08]"
                  >
                    <span>{link.label}</span>
                    <span aria-hidden="true" className="text-sm text-white/60">
                      →
                    </span>
                  </Link>
                ))}
                {adminToken ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-2 inline-flex items-center justify-between rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-500/20"
                  >
                    <span>Abmelden</span>
                    <span aria-hidden="true" className="text-sm">
                      ↺
                    </span>
                  </button>
                ) : null}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex w-full flex-1 items-start justify-center px-4 pb-24 pt-6 sm:pb-28 sm:pt-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-800 bg-gray-900/80 py-4 text-center text-xs text-white/40">
        Rotteck Pulli · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function IconBase({ className = "h-6 w-6", children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

function HamburgerIcon(props) {
  return (
    <IconBase {...props}>
      <path strokeWidth="2" strokeLinecap="round" d="M4 6h16" />
      <path strokeWidth="2" strokeLinecap="round" d="M4 12h16" />
      <path strokeWidth="2" strokeLinecap="round" d="M4 18h16" />
    </IconBase>
  );
}

function BrandIcon(props) {
  return (
    <IconBase {...props}>
      <path
        strokeWidth="2"
        strokeLinejoin="round"
        stroke={ACCENT_COLOR}
        d="M12 3 20 12l-8 9L4 12l8-9Z"
      />
    </IconBase>
  );
}

function CartIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 8h12l-1 11H7L6 8Z" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 8a3 3 0 0 1 6 0" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

function CloseIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}
