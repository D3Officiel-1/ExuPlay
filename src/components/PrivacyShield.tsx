
"use client";

import { useEffect, useState } from "react";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export function PrivacyShield() {
  const [shouldShield, setShouldShield] = useState(false);
  const [isBiometricPromptActive, setIsBiometricPromptActive] = useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    const handleBiometricActive = (e: any) => {
      setIsBiometricPromptActive(e.detail.active);
    };

    window.addEventListener("exu-biometric-active", handleBiometricActive);

    const localBiometric = localStorage.getItem("exu_biometric_enabled") === "true";
    setBiometricEnabled(localBiometric);

    if (user) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists() && snap.data().biometricEnabled) {
          setBiometricEnabled(true);
          localStorage.setItem("exu_biometric_enabled", "true");
        }
      });
    }

    const handleVisibilityChange = () => {
      if (!biometricEnabled) return;

      if (document.visibilityState === "hidden" && !isBiometricPromptActive) {
        setShouldShield(true);
      } else {
        setTimeout(() => setShouldShield(false), 500);
      }
    };

    const handleBlur = () => {
      if (biometricEnabled && !isBiometricPromptActive) {
        setShouldShield(true);
      }
    };

    const handleFocus = () => {
      setShouldShield(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("exu-biometric-active", handleBiometricActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [biometricEnabled, user, db, isBiometricPromptActive]);

  return (
    <AnimatePresence>
      {shouldShield && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-background pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}
