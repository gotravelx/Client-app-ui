"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Copy, Check, Plus, RefreshCw, Trash2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Navbar } from "@/components/navbar"
import { WalletSelectorModal } from "@/components/wallet-selector-modal"
import { toast } from "sonner"
import Link from "next/link"

type WalletType = "metamask" | "coinbase" | "trust";

interface SavedWallet {
  address: string
  type: WalletType
}

// Helper to detect window provider existence
const getDiscoveredProvider = (type: string) => {
  const discovered = (globalThis.window as any)?.__discoveredProviders
  if (!discovered) return null

  if (type === "metamask") {
    return discovered.get("io.metamask") || discovered.get("io.metamask.flask") || null
  }
  if (type === "coinbase") {
    return discovered.get("org.coinbase.wallet") || null
  }
  if (type === "trust") {
    return discovered.get("app.trustwallet") || discovered.get("com.trustwallet.app") || null
  }
  return null
}

const getCoinbaseProvider = () => {
  const win = globalThis.window as any
  if (win.coinbaseWalletExtension) return win.coinbaseWalletExtension
  const eth = win.ethereum
  if (eth?.isCoinbaseWallet) return eth
  if (eth?.providers?.length) {
    return eth.providers.find((p: any) => p.isCoinbaseWallet) || null
  }
  return null
}

const getTrustProvider = () => {
  const win = globalThis.window as any
  if (win.trustwallet) return win.trustwallet
  const eth = win.ethereum
  if (eth?.isTrust || eth?.isTrustWallet) return eth
  if (eth?.providers?.length) {
    return eth.providers.find((p: any) => p.isTrust || p.isTrustWallet) || null
  }
  return null
}

const getMetaMaskProvider = () => {
  const win = globalThis.window as any
  const eth = win.ethereum
  if (!eth) return null
  const isActualMetaMask = (p: any) => p?.isMetaMask && !p.isCoinbaseWallet && !p.isTrust && !p.isTrustWallet && !p.isBraveWallet && !p.isAvalanche
  if (eth.providers?.length) {
    return eth.providers.find(isActualMetaMask) || null
  }
  return isActualMetaMask(eth) ? eth : null
}

// Helper to detect window provider existence
const getProviderForType = (type: string) => {
  if (globalThis.window === undefined) return null

  // First check discovered EIP-6963 providers
  const discovered = getDiscoveredProvider(type)
  if (discovered) return discovered

  // Fallback to legacy injection detection
  if (type === "coinbase") return getCoinbaseProvider()
  if (type === "trust") return getTrustProvider()
  if (type === "metamask") return getMetaMaskProvider()

  return null
}


const fetchRpcBalance = async (rpcUrl: string, address: string): Promise<string | null> => {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    })
    const result = await response.json()
    if (result.result && result.result !== "0x0" && BigInt(result.result) > BigInt(0)) {
      return result.result
    }
  } catch (err) {
    console.warn(`RPC query failed for ${rpcUrl}:`, err)
  }
  return null
}

const fetchProviderBalance = async (type: string, address: string): Promise<string | null> => {
  const provider = getProviderForType(type)
  if (!provider) return null
  try {
    const balanceHex = await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    })
    return balanceHex
  } catch (err) {
    console.warn(`Failed fetching from provider for ${type}:`, err)
    return null
  }
}

const getSingleWalletBalance = async (walletAddress: string, type: string): Promise<string> => {
  const symbol = "CAM"
  
  let balanceHex = await fetchProviderBalance(type, walletAddress)

  if (!balanceHex || balanceHex === "0x0" || BigInt(balanceHex) === BigInt(0)) {
    balanceHex = await fetchRpcBalance("https://api.camino.network/ext/bc/C/rpc", walletAddress)
  }

  if (!balanceHex || balanceHex === "0x0" || BigInt(balanceHex) === BigInt(0)) {
    try {
      const response = await fetch("https://columbus.camino.network/ext/bc/C/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [walletAddress, "latest"],
          id: 1,
        }),
      })
      const result = await response.json()
      if (result.result) {
        balanceHex = result.result
      }
    } catch (testnetErr) {
      console.warn("Testnet RPC query failed:", testnetErr)
    }
  }

  if (balanceHex) {
    const wei = BigInt(balanceHex)
    const eth = Number(wei) / 1e18
    return `${eth.toFixed(3)} ${symbol}`
  }
  return `0.000 ${symbol}`
}

const requestAccountsForWallet = async (provider: any, walletType: string): Promise<void> => {
  if (walletType === "metamask") {
    try {
      await provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      })
    } catch (err: any) {
      if (err?.code === 4001) throw err
      await provider.request({ method: "eth_requestAccounts" })
    }
  } else {
    await provider.request({ method: "eth_requestAccounts" })
  }
}

export default function ProfilePage() {
  const { walletAddress, walletType, isConnecting: isWalletConnecting, connect: connectWallet, disconnect: disconnectWallet } = useAuth()
  const [activeWallet, setActiveWallet] = useState<string | null>(null)
  const [connectedWallets, setConnectedWallets] = useState<SavedWallet[]>([])
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [activeConnecting, setActiveConnecting] = useState<WalletType | null>(null)
  const [balances, setBalances] = useState<Record<string, string>>({})
  const isSwitchingRef = useRef(false)

  // Poll balances using standard JSON-RPC & Active Wallet Provider
  useEffect(() => {
    if (connectedWallets.length === 0) return

    let isMounted = true
    const fetchBalances = async () => {
      try {
        const newBalances: Record<string, string> = {}
        await Promise.all(
          connectedWallets.map(async (w) => {
            try {
              const formattedBalance = await getSingleWalletBalance(w.address, w.type)
              newBalances[w.address.toLowerCase()] = formattedBalance
            } catch (err) {
              console.error(`Error fetching balance for ${w.address}:`, err)
              newBalances[w.address.toLowerCase()] = "0.000 CAM"
            }
          })
        )

        if (isMounted) {
          setBalances((prev) => ({ ...prev, ...newBalances }))
        }
      } catch (err) {
        console.error("Error fetching balances:", err)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 15000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [connectedWallets, activeWallet])

  // Sync state from LocalStorage on mount & updates
  useEffect(() => {
    const saved = localStorage.getItem("connectedWallets")
    let list: SavedWallet[] = []
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          list = parsed
        }
      } catch (e) {
        console.error("Error parsing saved wallets:", e)
      }
    }

    if (walletAddress && walletType) {
      const addr = walletAddress.toLowerCase()
      const existing = list.find((w) => w.address.toLowerCase() === addr)
      if (!existing) {
        list = [...list, { address: walletAddress, type: walletType }]
        localStorage.setItem("connectedWallets", JSON.stringify(list))
      }
    }

    setConnectedWallets(list)

    if (walletAddress) {
      setActiveWallet(walletAddress.toLowerCase())
    } else {
      setActiveWallet(null)
    }
  }, [walletAddress, walletType])

  const addWalletToSavedList = (address: string, type: WalletType) => {
    const addr = address.toLowerCase()
    setConnectedWallets((prev) => {
      const existing = prev.find((w) => w.address.toLowerCase() === addr)
      if (existing) {
        if (existing.type !== type) {
          const updated = prev.map((w) => (w.address.toLowerCase() === addr ? { address: addr, type } : w))
          localStorage.setItem("connectedWallets", JSON.stringify(updated))
          return updated
        }
        return prev
      } else {
        const updated = [...prev, { address: addr, type }]
        localStorage.setItem("connectedWallets", JSON.stringify(updated))
        return updated
      }
    })
  }

  const handleWalletSelected = async (type: WalletType) => {
    try {
      setActiveConnecting(type)
      await connectWallet(type)
      const freshAddress = localStorage.getItem("walletAddress")
      if (freshAddress) {
        addWalletToSavedList(freshAddress, type)
        setActiveWallet(freshAddress.toLowerCase())
        toast.success("Wallet successfully linked!")
      }
      setShowWalletModal(false)
    } catch (error: any) {
      console.error("Failed to connect wallet:", error)
      toast.error("Connection failed", {
        description: error.message || "User rejected connection request.",
      })
    } finally {
      setActiveConnecting(null)
    }
  }

  const switchWallet = async (wallet: SavedWallet) => {
    if (isSwitchingRef.current) return
    const provider = getProviderForType(wallet.type)
    if (!provider) {
      const walletNames: Record<string, string> = {
        metamask: "MetaMask",
        coinbase: "Coinbase Wallet",
        trust: "Trust Wallet",
      }
      const walletName = walletNames[wallet.type] || "Wallet"
      toast.error(`Please install ${walletName} to connect.`)
      return
    }

    isSwitchingRef.current = true
    try {
      let accounts = await provider.request({ method: "eth_accounts" })
      let activeAccount = accounts[0]?.toLowerCase()

      if (!activeAccount || activeAccount !== wallet.address.toLowerCase()) {
        await requestAccountsForWallet(provider, wallet.type)
        const freshAccounts = await provider.request({ method: "eth_accounts" })
        activeAccount = freshAccounts[0]?.toLowerCase()
      }

      if (activeAccount && activeAccount === wallet.address.toLowerCase()) {
        localStorage.setItem("walletAddress", activeAccount)
        localStorage.setItem("walletType", wallet.type)
        // Update local context manually to sync
        globalThis.window.location.reload()
      } else {
        toast.error("Failed to switch wallet", {
          description: `Please select account ${wallet.address.substring(0, 8)}... inside your wallet app/extension.`,
        })
      }
    } catch (err: any) {
      console.error("Switching wallet error:", err)
      toast.error("Switch failed")
    } finally {
      isSwitchingRef.current = false
    }
  }

  const removeWalletFromSaved = (addressToRemove: string) => {
    const addr = addressToRemove.toLowerCase()
    const updated = connectedWallets.filter((w) => w.address.toLowerCase() !== addr)
    setConnectedWallets(updated)
    localStorage.setItem("connectedWallets", JSON.stringify(updated))
    toast.success("Wallet unlinked.")

    if (activeWallet === addr) {
      disconnectWallet()
      setActiveWallet(null)
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    toast.success("Address copied!")
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const getWalletBadge = (type: string) => {
    switch (type) {
      case "coinbase":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            🔵 Coinbase Wallet
          </span>
        )
      case "trust":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            🛡️ Trust Wallet
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            🦊 MetaMask
          </span>
        )
    }
  }

  const renderWalletCard = (wallet: SavedWallet) => {
    const address = wallet.address.toLowerCase()
    const isActive = activeWallet === address

    return (
      <Card
        key={address}
        className={`transition-all duration-300 border-2 overflow-hidden ${
          isActive
            ? "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-500/[0.02] shadow-md"
            : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700/80 shadow-sm"
        }`}
      >
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className={`p-3 rounded-xl shrink-0 transition-all ${
                isActive
                  ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-50 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500"
              }`}
            >
              <Wallet className="h-5.5 w-5.5" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold tracking-tight text-slate-800 dark:text-zinc-100 break-all select-all">
                  {wallet.address}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
                  onClick={() => copyAddress(wallet.address)}
                  title="Copy Wallet Address"
                >
                  {copiedAddress === wallet.address ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {getWalletBadge(wallet.type)}

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm transition-all">
                  <span className="font-bold text-[10px] uppercase text-blue-500 dark:text-blue-400/80 mr-0.5">Balance:</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse mr-0.5" />
                  {balances[address] || "Checking..."}
                </div>

                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Session</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-slate-500 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                    <span>Linked Account</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto justify-end w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-50 dark:border-zinc-800/40">
            {isActive ? (
              <div className="h-9 px-3 inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                Active Session
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 h-9 text-xs font-bold hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white border-slate-200 dark:border-zinc-800 transition-all rounded-lg"
                onClick={() => switchWallet(wallet)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Switch Wallet
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all shrink-0"
              onClick={() => removeWalletFromSaved(wallet.address)}
              title="Unlink Wallet"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-[#060913] text-zinc-900 dark:text-white">
      <Navbar />
      
      <div className="w-full max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-zinc-800 pb-6 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
              Manage Wallet
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connect and manage multiple Web3 wallet accounts for transactions.
            </p>
          </div>
          <Button
            onClick={() => setShowWalletModal(true)}
            className="gap-2 font-bold px-5 h-11 bg-primary hover:bg-primary/95 text-primary-foreground transition-all rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 self-start sm:self-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            Link New Wallet
          </Button>
        </div>

        <div className="space-y-10">
          {connectedWallets.length > 0 ? (
            <div className="space-y-8">
              {/* MetaMask Group */}
              {connectedWallets.some((w) => w.type === "metamask") && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                      🦊 MetaMask Accounts
                    </span>
                    <div className="h-px bg-slate-100 dark:bg-zinc-800/80 flex-1 ml-4" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {connectedWallets
                      .filter((w) => w.type === "metamask")
                      .map(renderWalletCard)}
                  </div>
                </div>
              )}

              {/* Coinbase Wallet Group */}
              {connectedWallets.some((w) => w.type === "coinbase") && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                      🔵 Coinbase Wallet Accounts
                    </span>
                    <div className="h-px bg-slate-100 dark:bg-zinc-800/80 flex-1 ml-4" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {connectedWallets
                      .filter((w) => w.type === "coinbase")
                      .map(renderWalletCard)}
                  </div>
                </div>
              )}

              {/* Trust Wallet Group */}
              {connectedWallets.some((w) => w.type === "trust") && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150">
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                      🛡️ Trust Wallet Accounts
                    </span>
                    <div className="h-px bg-slate-100 dark:bg-zinc-800/80 flex-1 ml-4" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {connectedWallets
                      .filter((w) => w.type === "trust")
                      .map(renderWalletCard)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl shadow-none">
              <CardContent className="py-16 text-center space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-full inline-block">
                  <Wallet className="h-10 w-10 text-slate-400 dark:text-zinc-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-lg text-slate-800 dark:text-zinc-200">No wallets linked yet</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Link your Web3 wallet accounts to display and manage them here.
                  </p>
                </div>
                <Button onClick={() => setShowWalletModal(true)} className="font-bold">
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <WalletSelectorModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletSelected={handleWalletSelected}
        isConnecting={isWalletConnecting}
        activeConnecting={activeConnecting}
      />
    </div>
  )
}
