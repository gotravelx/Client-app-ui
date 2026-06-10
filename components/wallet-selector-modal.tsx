"use client"

import { RefreshCw, X, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"

export const MetaMaskIcon = (props: any) => (
  <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M295.3 177.3l-24.9-82.6-88.6-47.5-31.8 45.4-31.8-45.4-88.6 47.5-24.9 82.6 30 73.1 75.3 35.2 39.9 8.2 40.1-8.2 75.3-35.2 30-73.1z" fill="#E2761B" />
    <path d="M160 271.1l-61.9-46.7 13.9-9.5 48 34.6 48-34.6 13.9 9.5z" fill="#E2761B" />
    <path d="M30 171.1l70.1-66.2 21.9 49.3-56.1 48.9z" fill="#E2761B" />
    <path d="M290 171.1l-70.1-66.2-21.9 49.3 56.1 48.9z" fill="#E2761B" />
    <path d="M100.1 104.9l59.9 29.8 59.9-29.8-59.9-35.1z" fill="#F6851B" />
    <path d="M160 183.1l-24.9-18.2 24.9-30.2 24.9 30.2z" fill="#F6851B" />
    <path d="M78.1 192.1l22-87.2-22.1 49.3z" fill="#763D16" />
    <path d="M241.9 192.1l-22-87.2 22.1 49.3z" fill="#763D16" />
    <path d="M100.1 104.9L160 134.7v48.4l-59.9-15.8z" fill="#CD6116" />
    <path d="M219.9 104.9L160 134.7v48.4l59.9-15.8z" fill="#CD6116" />
    <path d="M160 271.1l-50.1-70.4 12.1 11.2 38 41.5 38-41.5 12.1-11.2z" fill="#D7C1B1" />
  </svg>
)

export const CoinbaseIcon = (props: any) => (
  <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="320" height="320" rx="160" fill="#0052FF"/>
    <rect x="80" y="80" width="160" height="160" rx="36" fill="#FFFFFF"/>
  </svg>
)

export const TrustIcon = (props: any) => (
  <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M160 40C94.5 40 40 89.2 40 149.9C40 220 98.3 268.4 149.2 278.8C156.4 280.3 163.6 280.3 170.8 278.8C221.7 268.4 280 220 280 149.9C280 89.2 225.5 40 160 40Z" fill="#0500FF" opacity="0.1" />
    <path d="M160 40L280 149.9C280 220 221.7 268.4 170.8 278.8C163.6 280.3 156.4 280.3 149.2 278.8C98.3 268.4 40 220 40 149.9L160 40Z" fill="#3375BB" />
    <path d="M160 40V280C163.6 280 167.2 279.4 170.8 278.8C221.7 268.4 280 220 280 149.9L160 40Z" fill="#2E6299" />
    <path d="M160 72.8L252.8 152.1C252.8 203.2 209.6 238.4 170.8 245.9V72.8H160Z" fill="#FFFFFF" />
    <path d="M160 72.8V245.9C121.2 238.4 78 203.2 78 152.1L160 72.8Z" fill="#FFFFFF" opacity="0.9" />
  </svg>
)

const detectMetaMask = () => {
  if (typeof window === "undefined") return false
  const discovered = (window as any).__discoveredProviders
  if (discovered && (discovered.has("io.metamask") || discovered.has("io.metamask.flask"))) return true
  const ethereum = (window as any).ethereum
  if (!ethereum) return false
  const isActualMetaMask = (p: any) => p && p.isMetaMask && !p.isCoinbaseWallet && !p.isTrust && !p.isTrustWallet && !p.isBraveWallet && !p.isAvalanche
  if (ethereum.providers?.length) return ethereum.providers.some(isActualMetaMask)
  return !!isActualMetaMask(ethereum) || !!ethereum.isMetaMask
}

const detectCoinbase = () => {
  if (typeof window === "undefined") return false
  const discovered = (window as any).__discoveredProviders
  if (discovered && discovered.has("org.coinbase.wallet")) return true
  if ((window as any).coinbaseWalletExtension) return true
  const ethereum = (window as any).ethereum
  if (!ethereum) return false
  if (ethereum.providers?.length) return ethereum.providers.some((p: any) => p.isCoinbaseWallet)
  return !!ethereum.isCoinbaseWallet
}

const detectTrust = () => {
  if (typeof window === "undefined") return false
  const discovered = (window as any).__discoveredProviders
  if (discovered && (discovered.has("app.trustwallet") || discovered.has("com.trustwallet.app"))) return true
  if ((window as any).trustwallet) return true
  const ethereum = (window as any).ethereum
  if (!ethereum) return false
  if (ethereum.providers?.length) return ethereum.providers.some((p: any) => p.isTrust || p.isTrustWallet)
  return !!ethereum.isTrust || !!ethereum.isTrustWallet
}

interface WalletSelectorModalProps {
  open: boolean
  onClose: () => void
  onWalletSelected: (type: "metamask" | "coinbase" | "trust") => void
  isConnecting: boolean
  activeConnecting: "metamask" | "coinbase" | "trust" | null
}

export function WalletSelectorModal({
  open,
  onClose,
  onWalletSelected,
  isConnecting,
  activeConnecting,
}: WalletSelectorModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-slate-950/45 dark:bg-black/45 z-[100] flex items-center justify-center p-4 backdrop-blur-none animate-in fade-in duration-300">
      <div className="relative max-w-[460px] w-full p-6 md:p-8 rounded-[28px] border border-zinc-200/80 dark:border-white/5 bg-white/95 dark:bg-[#0b0f19]/95 shadow-[0_24px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.6)] text-zinc-900 dark:text-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors duration-200 z-20"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative pb-5 border-b border-zinc-200/60 dark:border-white/10 z-10">
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Connect Wallet
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5">
            Choose a wallet provider to connect and manage your accounts.
          </p>
        </div>

        <div className="grid gap-3.5 pt-5 pb-1 relative z-10">
          {/* MetaMask Option */}
          <button
            onClick={() => {
              if (mounted && detectMetaMask()) {
                onWalletSelected("metamask")
              } else {
                window.open("https://metamask.io/download/", "_blank")
              }
            }}
            disabled={isConnecting && activeConnecting !== "metamask"}
            className="flex items-center justify-between w-full p-4 rounded-[16px] border border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] hover:bg-zinc-100/80 dark:hover:bg-white/[0.05] hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-200 cursor-pointer group disabled:opacity-50 text-left animate-in"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100/80 dark:bg-white/[0.03] group-hover:bg-zinc-200 dark:group-hover:bg-white/[0.06] border border-zinc-200/80 dark:border-white/5 flex items-center justify-center transition-colors duration-200 p-2 shadow-sm">
                <MetaMaskIcon className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 group-hover:dark:text-white transition-colors duration-200">
                  MetaMask
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 max-w-[180px] truncate">
                  Connect to MetaMask extension
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnecting && activeConnecting === "metamask" ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : mounted && detectMetaMask() ? (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Detected
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/5 px-3 py-1 rounded-full text-[10px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 group-hover:dark:text-zinc-200 font-semibold transition-colors">
                  Get
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </button>

          {/* Coinbase Wallet Option */}
          <button
            onClick={() => {
              if (mounted && detectCoinbase()) {
                onWalletSelected("coinbase")
              } else {
                window.open("https://www.coinbase.com/wallet/downloads", "_blank")
              }
            }}
            disabled={isConnecting && activeConnecting !== "coinbase"}
            className="flex items-center justify-between w-full p-4 rounded-[16px] border border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] hover:bg-zinc-100/80 dark:hover:bg-white/[0.05] hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-200 cursor-pointer group disabled:opacity-50 text-left animate-in"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100/80 dark:bg-white/[0.03] group-hover:bg-zinc-200 dark:group-hover:bg-white/[0.06] border border-zinc-200/80 dark:border-white/5 flex items-center justify-center transition-colors duration-200 p-2 shadow-sm">
                <CoinbaseIcon className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 group-hover:dark:text-white transition-colors duration-200">
                  Coinbase Wallet
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 max-w-[180px] truncate">
                  Link with Coinbase Wallet
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnecting && activeConnecting === "coinbase" ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : mounted && detectCoinbase() ? (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Detected
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/5 px-3 py-1 rounded-full text-[10px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 group-hover:dark:text-zinc-200 font-semibold transition-colors">
                  Get
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </button>

          {/* Trust Wallet Option */}
          <button
            onClick={() => {
              if (mounted && detectTrust()) {
                onWalletSelected("trust")
              } else {
                window.open("https://trustwallet.com/download", "_blank")
              }
            }}
            disabled={isConnecting && activeConnecting !== "trust"}
            className="flex items-center justify-between w-full p-4 rounded-[16px] border border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] hover:bg-zinc-100/80 dark:hover:bg-white/[0.05] hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-200 cursor-pointer group disabled:opacity-50 text-left animate-in"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100/80 dark:bg-white/[0.03] group-hover:bg-zinc-200 dark:group-hover:bg-white/[0.06] border border-zinc-200/80 dark:border-white/5 flex items-center justify-center transition-colors duration-200 p-2 shadow-sm">
                <TrustIcon className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-zinc-800 dark:text-zinc-100 group-hover:text-zinc-900 group-hover:dark:text-white transition-colors duration-200">
                  Trust Wallet
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 max-w-[180px] truncate">
                  Connect using Trust Wallet
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnecting && activeConnecting === "trust" ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />
              ) : mounted && detectTrust() ? (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Detected
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/[0.03] hover:bg-zinc-200 dark:hover:bg-white/[0.06] border border-zinc-200 dark:border-white/5 px-3 py-1 rounded-full text-[10px] text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 group-hover:dark:text-zinc-200 font-semibold transition-colors">
                  Get
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
