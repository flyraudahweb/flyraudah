import { useTranslation } from "react-i18next";
import { Star, CheckCircle2, Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Ahmed Musa",
    package: "Hajj 2025",
    rating: 5,
    quote: "Raudah Travels made my Hajj journey seamless. From visa processing to the premium accommodation in Makkah, everything was perfectly organized. I highly recommend them!",
    avatar: "AM",
  },
  {
    name: "Fatima Ibrahim",
    package: "Ramadan Umrah 2025",
    rating: 5,
    quote: "An unforgettable spiritual experience! The hotels were close to the Haram and the guides were incredibly knowledgeable. Will definitely travel with Raudah again.",
    avatar: "FI",
  },
  {
    name: "Ibrahim Sani",
    package: "Sha'ban Umrah 2025",
    rating: 5,
    quote: "Excellent value for money. The team was responsive and supportive throughout the entire trip. The pre-departure training was very helpful for first-timers.",
    avatar: "IS",
  },
];

const Testimonials = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-8 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
            {t("testimonials.title")}
          </h2>
          <div className="ornament-divider mt-4 mb-4">
            <div className="diamond" />
          </div>
          <p className="text-muted-foreground tracking-wide">{t("testimonials.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, i) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative bg-card border border-border rounded-xl p-8 hover:shadow-gold transition-shadow overflow-hidden"
            >
              {/* Decorative quote mark */}
              <Quote className="absolute top-4 right-4 h-16 w-16 text-secondary/10 rotate-180" />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg ring-3 ring-secondary/30 ring-offset-2 ring-offset-card">
                    {test.avatar}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-foreground flex items-center gap-1.5">
                      {test.name}
                      <CheckCircle2 className="h-4 w-4 text-secondary fill-secondary/20" />
                    </p>
                    <p className="text-xs text-muted-foreground">{test.package}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: test.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{test.quote}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
