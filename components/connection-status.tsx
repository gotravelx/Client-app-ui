import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ConnectionStatusProps {
  isConnected: boolean
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1">
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  <span>Connected to Camino Network</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>Disconnected</span>
                </>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isConnected ? "WebSocket connection active" : "WebSocket connection failed"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
