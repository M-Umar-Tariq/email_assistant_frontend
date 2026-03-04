"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as api from "./api"

type User = { id: string; email: string; name: string }

type AuthContextType = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User | null) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUserState] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const t = api.getAccessToken()
    const u = api.getStoredUser()
    setToken(t)
    setUserState(u)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const onSessionExpired = () => {
      setToken(null)
      setUserState(null)
      router.replace("/login")
    }
    window.addEventListener("auth:session-expired", onSessionExpired)
    return () => window.removeEventListener("auth:session-expired", onSessionExpired)
  }, [router])

  const setUser = useCallback((u: User | null) => {
    setUserState(u)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login(email, password)
      api.setTokens(res.access_token, res.refresh_token, res.user)
      setToken(res.access_token)
      setUserState(res.user)
      router.push("/app")
    },
    [router]
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.auth.register(email, password, name)
      api.setTokens(res.access_token, res.refresh_token, res.user)
      setToken(res.access_token)
      setUserState(res.user)
      router.push("/app")
    },
    [router]
  )

  const logout = useCallback(async () => {
    const refresh = typeof window !== "undefined" ? localStorage.getItem("mailmind_refresh_token") : null
    try {
      if (refresh) await api.auth.logout(refresh)
    } catch {
      // ignore
    }
    api.clearAuth()
    setToken(null)
    setUserState(null)
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
