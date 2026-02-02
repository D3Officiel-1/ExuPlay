import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-6 bg-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative animate-in fade-in zoom-in duration-1000">
        <Logo className="scale-150 md:scale-[2]" />
      </div>
      
      <div className="mt-20 text-center space-y-4 max-w-lg animate-in slide-in-from-bottom-8 duration-1000 delay-300">
        <p className="text-muted-foreground font-serif italic text-xl leading-relaxed">
          "L'avenir appartient à ceux qui croient à la beauté de leurs rêves."
        </p>
        <div className="h-px w-12 bg-primary/20 mx-auto" />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
          Version 2.0 Major Update
        </p>
      </div>
    </main>
  );
}
