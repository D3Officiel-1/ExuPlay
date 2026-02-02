
"use client";

import { useEffect, useState } from "react";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export function PrivacyShield() {
  const [shouldShield, setShouldShield] = useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    // Vérification rapide via localStorage
    const localBiometric = localStorage.getItem("citation_biometric_enabled") === "true";
    setBiometricEnabled(localBiometric);

    // Synchronisation Firestore pour plus de fiabilité
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists() && snap.data().biometricEnabled) {
          setBiometricEnabled(true);
        }
      });
    }

    const handleVisibilityChange = () => {
      if (!biometricEnabled) return;

      if (document.visibilityState === "hidden") {
        setShouldShield(true);
      } else {
        // On laisse un petit délai pour que le système de lock puisse prendre le relais si nécessaire
        setTimeout(() => setShouldShield(false), 500);
      }
    };

    const handleBlur = () => {
      if (biometricEnabled) setShouldShield(true);
    };

    const handleFocus = () => {
      setShouldShield(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [biometricEnabled, user, db]);

  return (
    <AnimatePresence>
      {shouldShield && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[9999] bg-background pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}
