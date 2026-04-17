import { useEffect, useState } from "react";
import { Sun, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

const TopBar = () => {
  const [makkahTime, setMakkahTime] = useState(new Date());
  const [temperature, setTemperature] = useState<number | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setMakkahTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Makkah temperature
  useEffect(() => {
    const fetchTemp = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=21.4266&longitude=39.8261&current=temperature_2m"
        );
        const data = await res.json();
        if (data && data.current && data.current.temperature_2m !== undefined) {
          setTemperature(Math.round(data.current.temperature_2m));
        }
      } catch (error) {
        console.error("Failed to fetch Makkah temperature:", error);
      }
    };
    fetchTemp();
  }, []);

  // Format the time as if we are in Riyadh timezone
  // Note: Simple approach for React client - we can just format locally but force timezone if needed,
  // or use Intl.DateTimeFormat
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(makkahTime);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(makkahTime);

  // Parse the output string "April 17, 2026" to "17-April-2026" to match design exactly
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).formatToParts(makkahTime); // [{type: 'month', value: 'April'}, ...]
  
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  const customDateStr = `${day}-${month}-${year}`;

  return (
    <div className="bg-[#f8fafc] text-gray-700 text-xs sm:text-[13px] py-1.5 px-4 border-b border-gray-200/60 flex justify-center items-center transition-all">
      <div className="container mx-auto flex flex-wrap justify-center items-center gap-4 sm:gap-8 w-full text-center">
        <div className="flex items-center gap-1.5 font-medium">
          <Sun className="h-4 w-4 text-[#2BB673]" />
          <span>{temperature !== null ? `${temperature}°C` : "--°C"}</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-gray-500">
          <CalendarIcon className="h-4 w-4" />
          <span>{customDateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{formattedTime}</span>
        </div>
        <div className="flex items-center gap-1 font-medium text-gray-500">
          <MapPin className="h-4 w-4" />
          <span>Makkah</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
