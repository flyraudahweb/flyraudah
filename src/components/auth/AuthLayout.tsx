import { ReactNode } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout = ({ children, title, subtitle }: Props) => {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - decorative (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/70 to-primary/40" />

        {/* Subtle geometric overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 40px, white 40px, white 41px)`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12">
          <Link to="/">
            <img
              src="/logo.png"
              alt="Raudah Travels"
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
          <div className="space-y-6">
            <h2 className="font-heading text-4xl text-white font-bold leading-tight">
              Begin Your Spiritually<br />Uplifting Journey
            </h2>
            <p className="text-white/70 max-w-md font-body text-lg">
              Experience Hajj and Umrah with Nigeria's Most Trusted Travel Partner
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-[2px] bg-white/30 rounded-full" />
              <div className="w-2 h-2 rotate-45 border border-white/40" />
              <div className="w-12 h-[2px] bg-white/30 rounded-full" />
            </div>
            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Licensed & Certified
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                10,000+ Pilgrims Served
              </div>
            </div>
          </div>
          <p className="text-white/40 text-sm font-body">
            © 2026 Raudah Travels & Tours Ltd.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center lg:justify-center relative">
        {/* Mobile hero banner */}
        <div className="lg:hidden w-full sticky top-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-emerald-800" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 20px, white 20px, white 21px)`,
            }}
          />
          <div className="relative z-10 px-6 py-8 text-center">
            <Link to="/">
              <img
                src="/logo.png"
                alt="Raudah Travels"
                className="h-10 w-auto mx-auto brightness-0 invert mb-4"
              />
            </Link>
            <h2 className="font-heading text-xl text-white font-bold">
              Begin Your Spiritual Journey
            </h2>
            <p className="text-white/60 text-sm mt-1 font-body">
              Nigeria's Most Trusted Travel Partner
            </p>
          </div>
          {/* Curved bottom edge */}
          <div className="absolute -bottom-1 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 60V0C240 50 480 60 720 50C960 40 1200 45 1440 0V60H0Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </div>

        {/* Form area */}
        <div className="w-full max-w-md px-6 py-8 sm:py-12 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground font-body text-sm sm:text-base">{subtitle}</p>}
          </div>

          {/* Glassmorphic form card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sm:p-8 shadow-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
