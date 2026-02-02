
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { QUOTES, Quote } from "@/app/lib/quotes-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Navigation } from "@/components/Navigation";
import { RefreshCw, Heart, Share2, Quote as QuoteIcon, LogOut } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function RandomPage() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  const getRandomQuote = () => {
    setLoading(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * QUOTES.length);
      setQuote(QUOTES[randomIndex]);
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    getRandomQuote();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-primary/5 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto h-20 px-6 flex items-center justify-between">
          <Logo className="scale-50" />
          <Navigation />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl relative">
          <AnimatePresence mode="wait">
            {quote && (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 1.05 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden">
                  <CardContent className="p-12 sm:p-16 text-center space-y-12">
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="mx-auto w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center"
                    >
                      <QuoteIcon className="h-8 w-8 text-primary/20" />
                    </motion.div>

                    <div className="space-y-6">
                      <p className="text-2xl sm:text-3xl font-medium leading-tight tracking-tight italic">
                        "{quote.text}"
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-[0.3em]">{quote.author}</p>
                        {quote.work && <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{quote.work}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-primary/10 hover:bg-primary/5 group">
                        <Heart className="h-5 w-5 transition-transform group-hover:scale-110" />
                      </Button>
                      <Button onClick={getRandomQuote} disabled={loading} className="h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-xl shadow-primary/10">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Nouvelle Pensée
                      </Button>
                      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-primary/10 hover:bg-primary/5 group">
                        <Share2 className="h-5 w-5 transition-transform group-hover:scale-110" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative elements */}
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        </div>
      </main>
    </div>
  );
}
