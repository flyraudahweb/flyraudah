import { MessageCircle } from "lucide-react";

const WhatsAppFloat = () => {
  const handleClick = () => {
    const msg = encodeURIComponent("Hello Raudah Travels, I need assistance.");
    window.open(`https://wa.me/2348035378973?text=${msg}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
};

export default WhatsAppFloat;
