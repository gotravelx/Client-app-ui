"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useAuthLogic } from "@/hooks/use-auth"

type AuthContextType = ReturnType<typeof useAuthLogic>

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuthLogic()
    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
