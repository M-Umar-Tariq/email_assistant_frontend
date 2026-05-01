"use client"

import React, { createContext, useContext, useMemo, useState } from "react"
import type { ChatMessage } from "@/lib/mock-data"

type AiChatContextType = {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  selectedMailbox: string
  setSelectedMailbox: React.Dispatch<React.SetStateAction<string>>
  /** Shared across Assistant + floating chat so a request keeps “running” when navigating the dashboard. */
  isQueryLoading: boolean
  setIsQueryLoading: React.Dispatch<React.SetStateAction<boolean>>
}

const AiChatContext = createContext<AiChatContextType | null>(null)

export function useAiChat() {
  const ctx = useContext(AiChatContext)
  if (!ctx) {
    throw new Error("useAiChat must be used within AiChatProvider")
  }
  return ctx
}

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<string>("all")
  const [isQueryLoading, setIsQueryLoading] = useState(false)
  const value = useMemo(
    () => ({
      messages,
      setMessages,
      selectedMailbox,
      setSelectedMailbox,
      isQueryLoading,
      setIsQueryLoading,
    }),
    [messages, selectedMailbox, isQueryLoading],
  )
  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
}
