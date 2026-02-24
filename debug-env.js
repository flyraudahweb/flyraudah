console.log("VITE_SUPABASE_PUBLISHABLE_KEY:", process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
console.log("All VITE_ env vars:", Object.keys(process.env).filter(k => k.startsWith("VITE_")));
