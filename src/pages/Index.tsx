import { Helmet } from "react-helmet-async";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PackagesSection from "@/components/landing/PackagesSection";
import WhyChoose from "@/components/landing/WhyChoose";
import Testimonials from "@/components/landing/Testimonials";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";


const Index = () => {
  return (
    <>
      <Helmet>
        <title>Raudah Travels & Tours - Hajj & Umrah Packages 2026 | Nigeria</title>
        <meta name="description" content="Book premium Hajj & Umrah packages from Nigeria starting ₦3M. NAHCON licensed, 5-star hotels near Haram. 15+ years trusted service." />
        <link rel="canonical" href="https://flyraudah.com/" />
      </Helmet>
      <div className="min-h-screen">
        <Header />
        <main>
          <Hero />
          <PackagesSection />
          <WhyChoose />
          <Testimonials />
          <CTABanner />
        </main>
        <Footer />
        
      </div>
    </>
  );
};

export default Index;