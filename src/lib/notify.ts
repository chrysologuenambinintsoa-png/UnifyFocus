"use client"

import { toast } from "@/hooks/use-toast"

export function notifyGenerationFailure(message?: string) {
  toast({
    title: "Generation error",
    description: message ?? "An error occurred during generation.",
    variant: "destructive",
  })
}

export function notifyConnectionFailure(_context?: string, message?: string) {
  toast({
    title: "Connection error",
    description: message ?? "A connection error occurred.",
    variant: "destructive",
  })
}

export function notifyInsufficientCredits() {
  toast({
    title: "Insufficient credits",
    description: "You don\'t have enough credits to perform this action.",
    variant: "destructive",
  })
}
