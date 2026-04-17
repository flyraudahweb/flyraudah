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
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute -top-20 right-0 w-64 h-64 bg-[#2BB673]/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 left-0 w-64 h-64 bg-[#4CD964]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-sm font-bold tracking-widest uppercase text-[#2BB673] mb-3">
            Testimonials
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900">
            {t("testimonials.title")}
          </h2>
          <div className="mt-4 mb-4 flex items-center justify-center gap-3">
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-[#2BB673] rounded-full" />
            <div className="w-2 h-2 bg-[#2BB673] rounded-full" />
            <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-[#2BB673] rounded-full" />
          </div>
          <p className="text-gray-500 tracking-wide text-lg">{t("testimonials.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, i) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative bg-white rounded-2xl p-8 shadow-soft hover:shadow-soft-xl transition-all duration-300 overflow-hidden border border-gray-100 group"
            >
              {/* Decorative gradient corner */}
              <div className="absolute top-0 right-0 w-24 h-24 primary-gradient opacity-5 rounded-bl-full" />

              {/* Decorative quote mark */}
              <Quote className="absolute top-4 right-4 h-14 w-14 text-[#2BB673]/10 rotate-180" />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-full primary-gradient flex items-center justify-center text-white font-bold text-lg shadow-gold">
                    {test.avatar}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-gray-900 flex items-center gap-1.5">
                      {test.name}
                      <CheckCircle2 className="h-4 w-4 text-[#2BB673] fill-[#2BB673]/10" />
                    </p>
                    <p className="text-xs text-gray-400 font-medium">{test.package}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: test.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic leading-relaxed">
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
