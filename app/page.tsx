import { Navbar } from "@/components/navbar";
import Dashboard from "@/components/dashboard";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Dashboard />
      </main>
      <Toaster />
    </div>
  );
}
