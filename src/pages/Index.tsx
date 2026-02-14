import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PackagesSection from "@/components/landing/PackagesSection";
import WhyChoose from "@/components/landing/WhyChoose";
import Testimonials from "@/components/landing/Testimonials";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PackagesSection />
      <WhyChoose />
      <Testimonials />
      <CTABanner />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
