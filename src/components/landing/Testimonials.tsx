import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
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
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {t("testimonials.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("testimonials.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((test, i) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-gold transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {test.avatar}
                </div>
                <div>
                  <p className="font-heading font-bold text-foreground">{test.name}</p>
                  <p className="text-xs text-muted-foreground">{test.package}</p>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: test.rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-secondary text-secondary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{test.quote}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
