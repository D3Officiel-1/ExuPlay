
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoriquePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/profil");
  }, [router]);

  return null;
}
