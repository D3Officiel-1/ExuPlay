import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="group">
        <Logo className="text-4xl scale-125" />
      </div>
      <p className="mt-8 text-muted-foreground font-serif italic text-lg">
        "La sagesse commence dans l'émerveillement."
      </p>
    </main>
  );
}
