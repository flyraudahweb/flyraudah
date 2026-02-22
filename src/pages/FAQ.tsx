import { useState } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ChevronRight, ChevronDown, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const faqs = [
    { q: "What is the difference between Hajj and Umrah?", a: "Hajj is the annual Islamic pilgrimage to Makkah that takes place during specific days in Dhul Hijjah (the 12th month of the Islamic calendar). It is one of the Five Pillars of Islam and is obligatory for every Muslim who is physically and financially able. Umrah is a shorter, non-obligatory pilgrimage that can be performed at any time of the year." },
    { q: "How early should I book my Hajj package?", a: "We recommend booking at least 6–8 months before the Hajj season to secure the best prices and preferred accommodations. Early booking also allows ample time for visa processing and travel preparations." },
    { q: "What documents do I need for Hajj/Umrah?", a: "You will need a valid international passport (with at least 6 months validity), passport-sized photographs, a completed visa application form, proof of vaccination (including meningitis), and a certificate of Muslim faith. Our team will guide you through the entire documentation process." },
    { q: "Do you offer installment payment options?", a: "We offer deposit options to secure your spot. You can pay the remaining balance before the travel date via bank transfer or online through Paystack." },
    { q: "What is included in a typical Hajj package?", a: "Our Hajj packages typically include return flights, hotel accommodation in Makkah and Madinah near the Haramain, meals, ground transportation, guided rituals, visa processing, travel insurance, and 24/7 on-ground support." },
    { q: "Can I book for my family members?", a: "Absolutely! You can book for multiple pilgrims under a single reservation. We also offer special rates for group bookings including families, communities, and organizations." },
    { q: "How do I become a Raudah agent?", a: "You can apply through the 'Become an Agent' form on our website. Once approved, you'll receive access to our agent portal where you can manage clients, track commissions, and book packages on behalf of your customers." },
    { q: "What happens if my visa is rejected?", a: "In the unlikely event of a visa rejection, we will assist you with reapplication. If the rejection is beyond our control and the journey cannot proceed, our refund policy will apply based on the terms agreed upon at booking." },
    { q: "Are your packages licensed by NAHCON?", a: "Yes, Raudah Travels & Tours is fully licensed and regulated by the National Hajj Commission of Nigeria (NAHCON). We adhere to all guidelines and standards set by the commission to ensure pilgrim safety and service quality." },
    { q: "Do you provide spiritual guidance during the journey?", a: "Yes, all our packages include experienced Islamic scholars and guides who lead prayers, provide guidance on Hajj/Umrah rituals, and deliver religious talks throughout the journey." },
];

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
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
                        <span className="text-foreground font-medium">FAQ</span>
                    </nav>
                    <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
                    <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-border [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-border [&::after]:to-transparent">
                        <div className="diamond !bg-secondary/40" />
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-16">
                <div className="max-w-3xl mx-auto space-y-3">
                    {faqs.map((faq, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className="bg-card border border-border rounded-xl overflow-hidden hover:border-secondary/30 transition-colors"
                            >
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : i)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <HelpCircle className="h-5 w-5 text-secondary shrink-0" />
                                        <span className="font-medium text-foreground">{faq.q}</span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4 ml-8">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default FAQ;
