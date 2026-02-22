import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Home, ChevronRight, Plane, Hotel, BookOpen, HeadphonesIcon, CreditCard, Users, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
    {
        icon: Plane,
        title: "Hajj Packages",
        desc: "Comprehensive Hajj packages with flights, accommodations near the Haramain, guided rituals, meals, and ground transportation — available in Premium, Standard, and Budget tiers.",
    },
    {
        icon: BookOpen,
        title: "Umrah Packages",
        desc: "Year-round Umrah packages including Ramadan specials. Enjoy spiritual guidance, comfortable hotels, and seamless logistics from departure to return.",
    },
    {
        icon: Hotel,
        title: "Premium Accommodations",
        desc: "4 and 5-star hotels within walking distance of Masjid al-Haram in Makkah and Masjid an-Nabawi in Madinah, with carefully selected room types.",
    },
    {
        icon: MapPin,
        title: "Ziyarah Tours",
        desc: "Guided visits to historically significant Islamic sites in Makkah and Madinah, including Jabal al-Noor, Masjid Quba, and Jannat al-Baqi.",
    },
    {
        icon: HeadphonesIcon,
        title: "24/7 Pilgrim Support",
        desc: "Dedicated support team available round the clock — before, during, and after your journey. We handle visa processing, travel insurance, and on-ground assistance.",
    },
    {
        icon: CreditCard,
        title: "Secure Payments",
        desc: "Pay securely via bank transfer or online card payment through Paystack. We offer transparent pricing with deposit options to reserve your spot early.",
    },
    {
        icon: Users,
        title: "Group Bookings",
        desc: "Special rates and personalized arrangements for families, organizations, and community groups traveling together for Hajj or Umrah.",
    },
    {
        icon: ShieldCheck,
        title: "Agent Partnership Program",
        desc: "Become a Raudah-certified agent. Earn competitive commissions while helping pilgrims in your community access premium Hajj and Umrah services.",
    },
];

const Services = () => (
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
                    <span className="text-foreground font-medium">Services</span>
                </nav>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Our Services</h1>
                <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-border [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-border [&::after]:to-transparent">
                    <div className="diamond !bg-secondary/40" />
                </div>
            </div>
        </section>

        <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-16">
            <div className="max-w-3xl mx-auto text-center mb-12">
                <p className="text-muted-foreground text-lg leading-relaxed">
                    From premium flights and 5-star hotels to guided rituals and 24/7 pilgrim support — we handle every
                    detail so you can focus entirely on your spiritual journey.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((s, i) => (
                    <motion.div
                        key={s.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * i }}
                        className="bg-card border border-border rounded-xl p-6 hover:border-secondary/40 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
                                <s.icon className="h-6 w-6 text-secondary" />
                            </div>
                            <div>
                                <h3 className="font-heading text-lg font-bold text-foreground mb-2">{s.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>

        <Footer />
    </div>
);

export default Services;
