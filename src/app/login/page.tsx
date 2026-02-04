
import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { LoginClient } from "./login-client";

export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}): Promise<Metadata> {
  const params = await searchParams;
  const ref = params.ref as string;
  const username = params.u as string;
  const image = params.img as string;

  if (ref) {
    const ogImageUrl = `/api/og/referral?u=${encodeURIComponent(username || 'Esprit')}&c=${ref}${image ? `&img=${encodeURIComponent(image)}` : ''}`;
    
    return {
      title: `Rejoins l'Éveil d'Exu Play`,
      description: `L'esprit @${username || 'un ami'} t'invite à découvrir l'art de la pensée. Utilise son code : ${ref}`,
      openGraph: {
        title: `Invitation d'Éveil d'Exu Play`,
        description: `Rejoins @${username || 'un ami'} et explore les frontières de la pensée Ivoirienne.`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Invitation de parrainage de @${username || 'un ami'}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Invitation d'Éveil d'Exu Play`,
        description: `Rejoins @${username || 'un ami'} et explore les frontières de la pensée Ivoirienne.`,
        images: [ogImageUrl],
      },
    };
  }

  return {
    title: "Connexion | Exu Play",
    description: "Rejoignez le flux universel de l'éveil.",
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <LoginClient />
    </Suspense>
  );
}
