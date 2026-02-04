"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { motion, AnimatePresence } from "framer-motion"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="up">
      <ToastViewport />
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center p-4 pointer-events-none gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map(function ({ id, title, description, action, ...props }) {
            return (
              <motion.div
                key={id}
                layout
                initial={{ y: -100, opacity: 0, scale: 0.8, filter: "blur(15px)" }}
                animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ 
                  y: -20, 
                  opacity: 0, 
                  scale: 0.9, 
                  filter: "blur(20px)",
                  transition: { duration: 0.4, ease: "circIn" }
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8
                }}
                className="w-full flex justify-center pointer-events-auto"
              >
                <Toast {...props}>
                  <div className="flex flex-col gap-0.5">
                    {title && <ToastTitle>{title}</ToastTitle>}
                    {description && (
                      <ToastDescription>{description}</ToastDescription>
                    )}
                  </div>
                  {action}
                  <ToastClose />
                </Toast>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastProvider>
  )
}
