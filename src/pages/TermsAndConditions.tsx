import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Home, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const TermsAndConditions = () => (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header />

        {/* Hero */}
        <section className="relative pt-28 pb-12 bg-muted/20 border-b border-border/50">
            <div className="container mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                    <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                        <Home className="h-3.5 w-3.5" />Home
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium">Terms & Conditions</span>
                </nav>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Terms & Conditions</h1>
                <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-border [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-border [&::after]:to-transparent">
                    <div className="diamond !bg-secondary/40" />
                </div>
            </div>
        </section>

        <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-8 md:p-12 space-y-8">
                <p className="text-muted-foreground text-sm">Last updated: February 2026</p>

                {[
                    { title: "1. Acceptance of Terms", content: "By accessing and using the Raudah Travels & Tours platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services." },
                    { title: "2. Services", content: "Raudah Travels & Tours provides Hajj and Umrah pilgrimage booking services, including but not limited to flight arrangements, hotel accommodations, ground transportation, visa processing, and spiritual guidance. All services are subject to availability and the terms specified in individual packages." },
                    { title: "3. Booking & Payment", content: "A booking is confirmed only upon receipt of the required deposit or full payment. Payment can be made via bank transfer or the Paystack payment platform. All prices are quoted in Nigerian Naira (₦) and are subject to change without prior notice until a booking is confirmed." },
                    { title: "4. Cancellation & Refund", content: "Cancellation requests must be made in writing. Refunds are subject to the following: cancellations made 90+ days before travel receive a full refund minus a 5% admin fee; 60-89 days: 70% refund; 30-59 days: 50% refund; less than 30 days: no refund. Non-refundable deposits apply to certain packages as specified at the time of booking." },
                    { title: "5. Travel Documents", content: "It is the pilgrim's responsibility to ensure all travel documents (passport, visa, vaccination records) are valid and complete. Raudah Travels will assist with visa processing but is not responsible for visa rejections by the Saudi Arabian embassy." },
                    { title: "6. Liability", content: "Raudah Travels acts as an intermediary between pilgrims and service providers (airlines, hotels, etc.). We are not liable for delays, cancellations, or changes by these third-party providers. We carry appropriate travel insurance and recommend pilgrims do the same." },
                    { title: "7. Code of Conduct", content: "Pilgrims are expected to behave respectfully and in accordance with Islamic etiquette during the journey. Raudah Travels reserves the right to refuse service to individuals who violate these standards." },
                    { title: "8. Privacy", content: "Your personal information is handled in accordance with our Privacy Policy. We do not share your data with unauthorized third parties." },
                    { title: "9. Changes to Terms", content: "Raudah Travels reserves the right to modify these terms at any time. Updated terms will be posted on this page. Continued use of our services constitutes acceptance of the revised terms." },
                    { title: "10. Contact", content: "For questions about these Terms and Conditions, please contact us at flyraudah@gmail.com or call +234 803 537 8973." },
                ].map((section) => (
                    <div key={section.title}>
                        <h2 className="font-heading text-lg font-bold text-foreground mb-2">{section.title}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">{section.content}</p>
                    </div>
                ))}
            </motion.div>
        </section>

        <Footer />
    </div>
);

export default TermsAndConditions;
