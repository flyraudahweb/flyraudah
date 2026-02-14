import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Check, Share } from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 sm:px-10 lg:px-16 pt-32 pb-20">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-6 shadow-gold">
            <Smartphone className="h-10 w-10 text-secondary-foreground" />
          </div>

          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Install Raudah App
          </h1>
          <p className="text-muted-foreground mb-8">
            Get quick access to your bookings, packages, and travel documents right from your home screen.
          </p>

          {isInstalled ? (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
              <Check className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="text-foreground font-semibold">App is already installed!</p>
              <p className="text-sm text-muted-foreground mt-1">Open it from your home screen.</p>
            </div>
          ) : isIOS ? (
            <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
              <p className="font-semibold text-foreground text-center">Install on iPhone/iPad</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-secondary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap the <Share className="inline h-4 w-4 mx-1" /> <strong>Share</strong> button in Safari
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-secondary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-secondary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tap <strong>"Add"</strong> to install
                  </p>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button
              size="lg"
              onClick={handleInstall}
              className="gold-gradient text-secondary-foreground shadow-gold hover:shadow-gold-lg hover:-translate-y-1 transition-all text-lg px-12 py-7 font-semibold"
            >
              <Download className="h-5 w-5 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="bg-muted/50 border border-border rounded-xl p-6">
              <p className="text-muted-foreground text-sm">
                Open this page in your mobile browser to install the app, or use your browser's menu to add it to your home screen.
              </p>
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { label: "Works Offline", desc: "Access info without internet" },
              { label: "Fast & Light", desc: "No app store download needed" },
              { label: "Always Updated", desc: "Latest features automatically" },
            ].map((f) => (
              <div key={f.label} className="bg-card border border-border rounded-lg p-4">
                <p className="font-semibold text-foreground text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Install;