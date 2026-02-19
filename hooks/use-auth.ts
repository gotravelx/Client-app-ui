"use client"

import { useState, useEffect, useCallback } from "react"

declare global {
    interface Window {
        ethereum?: any;
    }
}

export function useAuthLogic() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const savedAddress = localStorage.getItem("walletAddress")
        if (savedAddress) {
            setWalletAddress(savedAddress)
        }
    }, [])

    const connect = useCallback(async () => {
        if (typeof window === "undefined" || !window.ethereum) {
            setError("MetaMask is not installed")
            return
        }

        setIsConnecting(true)
        setError(null)

        try {
            // Force MetaMask popup so user explicitly approves the connection
            await window.ethereum.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })

            // Get the approved account after user accepts
            const accounts = await window.ethereum.request({ method: "eth_accounts" })
            const address = accounts[0]

            // Store wallet address only — no tokens needed
            localStorage.setItem("walletAddress", address)
            setWalletAddress(address)
        } catch (err: any) {
            console.error("Connection error:", err)
            setError(err.message || "Failed to connect")
        } finally {
            setIsConnecting(false)
        }
    }, [])

    const disconnect = useCallback(() => {
        localStorage.removeItem("walletAddress")
        setWalletAddress(null)
    }, [])

    return {
        walletAddress,
        isConnecting,
        error,
        connect,
        disconnect,
        isConnected: !!walletAddress,
    }
}
