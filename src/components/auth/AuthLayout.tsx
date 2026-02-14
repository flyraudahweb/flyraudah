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
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/70 to-primary/40" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <Link to="/">
            <img
              src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
              alt="Raudah Travels"
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
          <div className="space-y-6">
            <h2 className="font-heading text-4xl text-secondary font-bold leading-tight">
              Begin Your Spiritually<br />Uplifting Journey
            </h2>
            <p className="text-secondary-foreground/80 max-w-md font-body text-lg">
              Experience Hajj and Umrah with Nigeria's Most Trusted Travel Partner
            </p>
            <div className="ornament-divider w-48">
              <div className="diamond" />
            </div>
          </div>
          <p className="text-secondary-foreground/50 text-sm font-body">
            © 2026 Raudah Travels & Tours Ltd.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <Link to="/">
              <img
                src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png"
                alt="Raudah Travels"
                className="h-12 w-auto"
              />
            </Link>
          </div>

          <div className="text-center space-y-2">
            <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground font-body">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
