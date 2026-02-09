
import HomeClient from "@/components/home/HomeClient";

// 3. Incremental Static Regeneration (ISR)
// Revalidate every 3600 seconds (1 hour) or when manually triggered.
// This ensures the page is static and fast (Zero-Lag) but stays fresh.
export const revalidate = 3600;

export default function Home() {
  return <HomeClient />;
}
