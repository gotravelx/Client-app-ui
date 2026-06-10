"use client"

import { useState, useEffect, useCallback } from "react"

declare global {
    interface Window {
        ethereum?: any;
        coinbaseWalletExtension?: any;
        trustwallet?: any;
    }
}

// EIP-6963 Multi-Injected Provider Discovery
if (typeof window !== "undefined") {
  if (!(window as any).__discoveredProviders) {
    (window as any).__discoveredProviders = new Map();
  }
  
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    const detail = event.detail;
    if (detail && detail.info && detail.provider) {
      (window as any).__discoveredProviders.set(detail.info.rdns, detail.provider);
      console.log(`[EIP-6963] Discovered provider: ${detail.info.name} (${detail.info.rdns})`);
    }
  });
  
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function useAuthLogic() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [walletType, setWalletType] = useState<"metamask" | "coinbase" | "trust" | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const savedAddress = localStorage.getItem("walletAddress")
        const savedType = localStorage.getItem("walletType") as "metamask" | "coinbase" | "trust" | null
        if (savedAddress) {
            setWalletAddress(savedAddress)
        }
        if (savedType) {
            setWalletType(savedType)
        }
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("eip6963:requestProvider"));
        }
    }, [])

    const connect = useCallback(async (type: "metamask" | "coinbase" | "trust") => {
        setIsConnecting(true)
        setError(null)

        try {
            // Re-announce all providers to ensure fresh discovery
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("eip6963:requestProvider"));
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            let provider = null;
            if (typeof window !== "undefined") {
                // 1. Try EIP-6963 discovered providers first
                const discovered = (window as any).__discoveredProviders;
                if (discovered) {
                    if (type === "metamask") {
                        provider = discovered.get("io.metamask") || discovered.get("io.metamask.flask");
                    } else if (type === "coinbase") {
                        provider = discovered.get("org.coinbase.wallet");
                    } else if (type === "trust") {
                        provider = discovered.get("app.trustwallet") || discovered.get("com.trustwallet.app");
                    }
                }

                // 2. Legacy/window-property fallback
                if (!provider) {
                    if (type === "coinbase") {
                        provider = (window as any).coinbaseWalletExtension || 
                                   ((window as any).ethereum?.isCoinbaseWallet ? (window as any).ethereum : null) ||
                                   (window as any).ethereum?.providers?.find((p: any) => p.isCoinbaseWallet);
                    } else if (type === "trust") {
                        provider = (window as any).trustwallet || 
                                   ((window as any).ethereum?.isTrust || (window as any).ethereum?.isTrustWallet ? (window as any).ethereum : null) ||
                                   (window as any).ethereum?.providers?.find((p: any) => p.isTrust || p.isTrustWallet);
                    } else if (type === "metamask") {
                        const eth = (window as any).ethereum;
                        if (eth) {
                            const isActualMetaMask = (p: any) => p && p.isMetaMask && !p.isCoinbaseWallet && !p.isTrust && !p.isTrustWallet && !p.isBraveWallet && !p.isAvalanche;
                            if (eth.providers?.length) {
                                provider = eth.providers.find(isActualMetaMask);
                            }
                            if (!provider && eth.providerMap) {
                                try {
                                    const mm = eth.providerMap.get("MetaMask");
                                    if (mm && isActualMetaMask(mm)) provider = mm;
                                } catch (e) {}
                            }
                            if (!provider && isActualMetaMask(eth)) {
                                provider = eth;
                            }
                        }
                    }
                }
            }

            if (!provider) {
                const name = type === "metamask" ? "MetaMask" : type === "coinbase" ? "Coinbase Wallet" : "Trust Wallet";
                throw new Error(`${name} is not installed or not discovered`);
            }

            // Force wallet popup for authorization (Only MetaMask supports requestPermissions)
            const isActualMetaMask = 
              type === "metamask" &&
              provider.isMetaMask &&
              !provider.isCoinbaseWallet &&
              !provider.isTrust &&
              !provider.isTrustWallet;

            if (isActualMetaMask) {
              try {
                await provider.request({
                  method: "wallet_requestPermissions",
                  params: [{ eth_accounts: {} }],
                })
              } catch (err: any) {
                console.warn("wallet_requestPermissions error:", err)
                if (err?.code === 4001) {
                  throw err
                }
              }
            }

            // Request accounts via requestAccounts (triggers connection popup on Coinbase/Trust)
            let accounts = await provider.request({ method: "eth_requestAccounts" })
            if (!accounts || accounts.length === 0) {
              // Fallback to eth_accounts
              accounts = await provider.request({ method: "eth_accounts" })
            }

            if (!accounts || accounts.length === 0) {
              throw new Error("No accounts found")
            }
            const address = accounts[0]

            localStorage.setItem("walletAddress", address)
            localStorage.setItem("walletType", type)
            setWalletAddress(address)
            setWalletType(type)
        } catch (err: any) {
            console.error("Connection error:", err)
            setError(err.message || "Failed to connect")
            throw err
        } finally {
            setIsConnecting(false)
        }
    }, [])

    const disconnect = useCallback(() => {
        localStorage.removeItem("walletAddress")
        localStorage.removeItem("walletType")
        setWalletAddress(null)
        setWalletType(null)
    }, [])

    return {
        walletAddress,
        walletType,
        isConnecting,
        error,
        connect,
        disconnect,
        isConnected: !!walletAddress,
    }
}
