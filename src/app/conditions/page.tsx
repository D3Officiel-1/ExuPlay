"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Scale, Shield, Users, BookOpen, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ConditionsPage() {
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const sections = [
    {
      icon: BookOpen,
      title: "L'Essence d'Exu Play",
      content: "Exu Play est une plateforme dédiée à l'exploration de la pensée. Nous fournissons des outils pour l'éveil spirituel et intellectuel à travers des citations et des défis philosophiques."
    },
    {
      icon: Shield,
      title: "Confidentialité & Sécurité",
      content: "Vos données biométriques (Passkeys) restent exclusivement sur votre appareil. Nous synchronisons uniquement vos préférences et votre progression pour garantir une expérience sans couture."
    },
    {
      icon: Zap,
      title: "Points & Éveil",
      content: "Les points récoltés lors des quiz sont le reflet de votre engagement. Ils n'ont aucune valeur monétaire et servent uniquement à mesurer votre parcours dans l'éveil."
    },
    {
      icon: Users,
      title: "Parrainage",
      content: "Le système de parrainage est conçu pour étendre notre communauté d'esprits éveillés. Tout abus du système pourra entraîner une réinitialisation de vos points."
    },
    {
      icon: Scale,
      title: "Responsabilité",
      content: "L'utilisateur est responsable de l'usage qu'il fait des réflexions partagées. Exu Play ne saurait être tenu responsable des interprétations personnelles des textes philosophiques."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full h-10 w-10 hover:bg-primary/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Légalité</p>
            <h1 className="text-3xl font-black tracking-tight">Conditions</h1>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {sections.map((section, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center">
                      <section.icon className="h-5 w-5 text-primary opacity-60" />
                    </div>
                    <h2 className="text-lg font-black tracking-tight">{section.title}</h2>
                  </div>
                  <p className="text-sm leading-relaxed opacity-60 font-medium italic">
                    "{section.content}"
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          <motion.div 
            variants={itemVariants}
            className="p-8 text-center opacity-20"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Version 2.0.4 - Mise à jour le 24 Mai 2024</p>
          </motion.div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
