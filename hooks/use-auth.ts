"use client"

import { useState, useEffect, useCallback } from "react"

export type WalletType = "metamask" | "coinbase" | "trust";

declare global {
    interface Window {
        ethereum?: any;
        coinbaseWalletExtension?: any;
        trustwallet?: any;
    }
}

// EIP-6963 Multi-Injected Provider Discovery
if (typeof globalThis !== "undefined" && typeof globalThis.addEventListener === "function") {
  if (!(globalThis as any).__discoveredProviders) {
    (globalThis as any).__discoveredProviders = new Map();
  }
  
  globalThis.addEventListener("eip6963:announceProvider", (event: any) => {
    const detail = event.detail;
    if (detail?.info && detail?.provider) {
      (globalThis as any).__discoveredProviders.set(detail.info.rdns, detail.provider);
      console.log(`[EIP-6963] Discovered provider: ${detail.info.name} (${detail.info.rdns})`);
    }
  });
  
  globalThis.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function useAuthLogic() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [walletType, setWalletType] = useState<WalletType | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const savedAddress = localStorage.getItem("walletAddress")
        const savedType = localStorage.getItem("walletType") as WalletType | null
        if (savedAddress) {
            setWalletAddress(savedAddress)
        }
        if (savedType) {
            setWalletType(savedType)
        }
        if (typeof globalThis !== "undefined" && typeof globalThis.dispatchEvent === "function") {
            globalThis.dispatchEvent(new Event("eip6963:requestProvider"));
        }
    }, [])

    const connect = useCallback(async (type: WalletType) => {
        setIsConnecting(true)
        setError(null)

        try {
            // Re-announce all providers to ensure fresh discovery
            if (typeof globalThis !== "undefined" && typeof globalThis.dispatchEvent === "function") {
                globalThis.dispatchEvent(new Event("eip6963:requestProvider"));
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const provider = findEthereumProvider(type);
            if (!provider) {
                const walletNames = {
                    metamask: "MetaMask",
                    coinbase: "Coinbase Wallet",
                    trust: "Trust Wallet",
                } as const;
                const name = walletNames[type];
                throw new Error(`${name} is not installed or not discovered`);
            }

            const accounts = await requestWalletAccounts(provider, type);
            if (accounts.length === 0) {
                throw new Error("No accounts found");
            }
            const address = accounts[0];

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

function getDiscoveredProvider(type: WalletType): any {
  if (typeof globalThis === "undefined") return null;
  const discovered = (globalThis as any).__discoveredProviders;
  if (!discovered) return null;

  if (type === "metamask") {
    return discovered.get("io.metamask") || discovered.get("io.metamask.flask") || null;
  }
  if (type === "coinbase") {
    return discovered.get("org.coinbase.wallet") || null;
  }
  if (type === "trust") {
    return discovered.get("app.trustwallet") || discovered.get("com.trustwallet.app") || null;
  }
  return null;
}

function getLegacyCoinbase(): any {
  if (typeof globalThis === "undefined") return null;
  const win = globalThis as any;
  return win.coinbaseWalletExtension || 
         (win.ethereum?.isCoinbaseWallet ? win.ethereum : null) ||
         win.ethereum?.providers?.find((p: any) => p.isCoinbaseWallet) || null;
}

function getLegacyTrust(): any {
  if (typeof globalThis === "undefined") return null;
  const win = globalThis as any;
  return win.trustwallet || 
         (win.ethereum?.isTrust || win.ethereum?.isTrustWallet ? win.ethereum : null) ||
         win.ethereum?.providers?.find((p: any) => p.isTrust || p.isTrustWallet) || null;
}

function getLegacyMetaMask(): any {
  if (typeof globalThis === "undefined") return null;
  const win = globalThis as any;
  
  const eth = win.ethereum;
  if (!eth) return null;

  const isActualMetaMask = (p: any) => p?.isMetaMask && !p?.isCoinbaseWallet && !p?.isTrust && !p?.isTrustWallet && !p?.isBraveWallet && !p?.isAvalanche;
  
  if (eth.providers?.length) {
    const found = eth.providers.find(isActualMetaMask);
    if (found) return found;
  }
  
  if (eth.providerMap) {
    try {
      const mm = eth.providerMap.get("MetaMask");
      if (mm && isActualMetaMask(mm)) return mm;
    } catch (error) {
      console.warn("Failed to get MetaMask provider from providerMap:", error);
    }
  }
  
  if (isActualMetaMask(eth)) {
    return eth;
  }

  return null;
}

function getLegacyProvider(type: WalletType): any {
  if (type === "coinbase") {
    return getLegacyCoinbase();
  }
  if (type === "trust") {
    return getLegacyTrust();
  }
  if (type === "metamask") {
    return getLegacyMetaMask();
  }
  return null;
}

function findEthereumProvider(type: WalletType): any {
  return getDiscoveredProvider(type) || getLegacyProvider(type);
}

async function requestWalletAccounts(provider: any, type: WalletType): Promise<string[]> {
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
      });
    } catch (err: any) {
      console.warn("wallet_requestPermissions error:", err);
      if (err?.code === 4001) {
        throw err;
      }
    }
  }

  let accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    accounts = await provider.request({ method: "eth_accounts" });
  }

  return accounts || [];
}
