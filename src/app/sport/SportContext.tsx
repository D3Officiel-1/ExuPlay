"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * @fileOverview Oracle du Contexte Sportif.
 * Permet de partager l'état du coupon entre la liste et les pages de détails.
 */

interface BetSelection {
  matchId: string;
  matchName: string;
  outcome: string;
  outcomeLabel: string;
  odd: number;
}

interface SportContextType {
  selections: BetSelection[];
  setSelections: React.Dispatch<React.SetStateAction<BetSelection[]>>;
  toggleSelection: (matchId: string, matchName: string, outcome: string, label: string, odd: number, status: string) => void;
  isCouponOpen: boolean;
  setIsCouponOpen: (open: boolean) => void;
  betAmount: string;
  setBetAmount: (amount: string) => void;
}

const SportContext = createContext<SportContextType | undefined>(undefined);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [betAmount, setBetAmount] = useState("50");

  const toggleSelection = (matchId: string, matchName: string, outcome: string, label: string, odd: number, status: string) => {
    if (status !== 'scheduled') return;
    
    setSelections(prev => {
      const existingIdx = prev.findIndex(s => s.matchId === matchId);
      if (existingIdx !== -1) {
        if (prev[existingIdx].outcome === outcome) return prev.filter(s => s.matchId !== matchId);
        const newSelections = [...prev];
        newSelections[existingIdx] = { matchId, matchName, outcome, outcomeLabel: label, odd };
        return newSelections;
      }
      return [...prev, { matchId, matchName, outcome, outcomeLabel: label, odd }];
    });
  };

  return (
    <SportContext.Provider value={{ 
      selections, 
      setSelections, 
      toggleSelection, 
      isCouponOpen, 
      setIsCouponOpen,
      betAmount,
      setBetAmount
    }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (!context) throw new Error("useSport must be used within a SportProvider");
  return context;
}
