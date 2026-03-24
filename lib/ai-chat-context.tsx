"use client"

import React, { createContext, useContext, useState } from "react"
import type { ChatMessage } from "@/lib/mock-data"

type AiChatContextType = {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  selectedMailbox: string
  setSelectedMailbox: React.Dispatch<React.SetStateAction<string>>
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
  return (
    <AiChatContext.Provider
      value={{ messages, setMessages, selectedMailbox, setSelectedMailbox }}
    >
      {children}
    </AiChatContext.Provider>
  )
}
