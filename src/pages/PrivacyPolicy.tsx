import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Home, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
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
                    <span className="text-foreground font-medium">Privacy Policy</span>
                </nav>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Privacy Policy</h1>
                <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-border [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-border [&::after]:to-transparent">
                    <div className="diamond !bg-secondary/40" />
                </div>
            </div>
        </section>

        <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-8 md:p-12 space-y-8">
                <p className="text-muted-foreground text-sm">Last updated: February 2026</p>

                {[
                    { title: "1. Introduction", content: "Raudah Travels & Tours (\"we\", \"us\", \"our\") respects your privacy and is committed to protecting the personal data you share with us. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website, mobile application, and services." },
                    { title: "2. Information We Collect", content: "We collect the following types of information: Personal identification details (full name, email, phone number), travel documents (passport information, visa details), payment information (transaction records, not card numbers — handled securely by Paystack), booking preferences and history, device information and usage analytics, and communication records (support tickets, chat messages)." },
                    { title: "3. How We Use Your Information", content: "Your information is used to: process bookings and manage your pilgrim account, communicate booking confirmations and travel updates, process payments securely through our payment partners, improve our services based on usage patterns, comply with legal and NAHCON regulatory requirements, and send promotional offers (only with your consent)." },
                    { title: "4. Data Security", content: "We implement industry-standard security measures including encryption (SSL/TLS), secure database storage with Row Level Security (RLS), access controls, and regular security audits. Payment processing is handled by PCI-compliant third parties (Paystack) — we never store your card details." },
                    { title: "5. Data Sharing", content: "We do not sell your personal data. We share information only with: airlines and hotel partners (to fulfill your booking), payment processors (Paystack), Saudi Arabian visa authorities (as required), and law enforcement (when legally required). All third parties are bound by confidentiality agreements." },
                    { title: "6. Data Retention", content: "We retain your personal data for as long as your account is active or as needed to provide services. After account deletion, we retain essential booking records for 7 years to comply with Nigerian tax and regulatory requirements." },
                    { title: "7. Your Rights", content: "You have the right to: access your personal data, request correction of inaccurate data, request deletion of your account and data, opt out of marketing communications, and request a copy of your data in a portable format. To exercise these rights, contact us at flyraudah@gmail.com." },
                    { title: "8. Cookies & Analytics", content: "We use essential cookies for authentication and session management. We may use analytics tools to understand how our platform is used. You can manage cookie preferences in your browser settings." },
                    { title: "9. Children's Privacy", content: "Our services are not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us for removal." },
                    { title: "10. Changes to This Policy", content: "We may update this Privacy Policy periodically. Changes will be posted on this page with an updated date. Continued use of our services after changes constitutes acceptance." },
                    { title: "11. Contact", content: "For questions or concerns about this Privacy Policy, please contact: Raudah Travels & Tours, Kano, Nigeria. Email: flyraudah@gmail.com. Phone: +234 803 537 8973." },
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

export default PrivacyPolicy;
