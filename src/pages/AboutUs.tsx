import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Home, ChevronRight, Heart, Users, Shield, Award, Target, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const AboutUs = () => {
    const values = [
        { icon: Heart, title: "Faith-Centered", desc: "Every journey is guided by Islamic principles and deep respect for the sacred rituals of Hajj and Umrah." },
        { icon: Shield, title: "Trust & Safety", desc: "Licensed by NAHCON, we ensure full compliance, transparent pricing, and pilgrim protection at every step." },
        { icon: Users, title: "Pilgrim First", desc: "We tailor every package to individual needs, offering dedicated 24/7 support before, during, and after your journey." },
        { icon: Award, title: "Excellence", desc: "Premium accommodations near the Haramain, experienced guides, and meticulous attention to detail define our service." },
        { icon: Target, title: "Accessibility", desc: "From budget-friendly to premium tiers, we make the Holy Lands accessible to pilgrims across all walks of life." },
        { icon: Globe, title: "Community", desc: "We have proudly served 10,000+ pilgrims, building a growing family of returnees who trust us with their spiritual journeys." },
    ];

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
                        <span className="text-foreground font-medium">About Us</span>
                    </nav>
                    <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">About Us</h1>
                    <div className="ornament-divider mt-3 mb-0 [&::before]:bg-gradient-to-r [&::before]:from-transparent [&::before]:via-border [&::before]:to-transparent [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-border [&::after]:to-transparent">
                        <div className="diamond !bg-secondary/40" />
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 sm:px-8 lg:px-12 py-16 space-y-16">
                {/* Mission */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center">
                    <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">Our Mission</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Raudah Travels & Tours is Nigeria's trusted partner for Hajj and Umrah pilgrimages. Founded with a passion
                        for serving the Muslim community, we are committed to making the sacred journey to Makkah and Madinah
                        a seamless, memorable, and spiritually enriching experience for every pilgrim.
                    </p>
                </motion.div>

                {/* Values */}
                <div>
                    <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Our Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {values.map((v, i) => (
                            <motion.div
                                key={v.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className="bg-card border border-border rounded-xl p-6 hover:border-secondary/40 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                                    <v.icon className="h-6 w-6 text-secondary" />
                                </div>
                                <h3 className="font-heading text-lg font-bold text-foreground mb-2">{v.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Story */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-card border border-border rounded-xl p-8 md:p-12 max-w-4xl mx-auto">
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Our Story</h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                        <p>
                            Based in Kano, Nigeria, Raudah Travels & Tours was born from a deep understanding of the challenges
                            Nigerian pilgrims face when planning their journey to the Holy Lands. We set out to create a service
                            that combines modern convenience with traditional Islamic values.
                        </p>
                        <p>
                            Over the years, we have grown from a small agency into one of Nigeria's most trusted Hajj and Umrah
                            operators. Our team of experienced guides, travel coordinators, and customer support staff work
                            tirelessly to ensure every pilgrim receives personalized attention and care.
                        </p>
                        <p>
                            We are licensed and regulated by NAHCON (National Hajj Commission of Nigeria), and we take pride in
                            our transparent pricing, premium accommodations, and the lasting relationships we build with our
                            pilgrims. Many of our clients return year after year — and that's the greatest testament to our service.
                        </p>
                    </div>
                </motion.div>
            </section>

            <Footer />
        </div>
    );
};

export default AboutUs;
