"use client";

import { useState } from "react";
import { ethers } from "ethers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Eye, Copy, Plane, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionLogProps {
  data: any[];
  type: "transaction" | "event";
}

export function TransactionLog({ data, type }: TransactionLogProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {type}s recorded yet. Waiting for blockchain activity...
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (timestamp: string | number) => {
    const date = new Date(
      typeof timestamp === "number" ? timestamp * 1000 : timestamp
    );
    return date.toLocaleString();
  };

  const getFlightDetails = (event: any) => {
    if (!event || !event.args)
      return {
        flightNumber: "-",
        carrierCode: "-",
        departureAirport: "-",
        arrivalAirport: "-",
      };

    // Different events have different structures
    if (event.eventName === "FlightDataSet") {
      return {
        flightNumber: event.args.flightNumber || "-",
        carrierCode: event.args.carrierCode || "-",
        departureAirport: event.args.departureAirport || "-",
        arrivalAirport: event.args.arrivalAirport || "-",
      };
    } else if (event.eventName === "currentFlightStatus") {
      return {
        flightNumber: event.args.flightNumber || "-",
        carrierCode: event.args.carrierCode || "-",
        departureAirport: "-", // Not available in this event
        arrivalAirport: "-", // Not available in this event
      };
    } else if (event.eventName === "SubscriptionDetails") {
      return {
        flightNumber: event.args.flightNumber || "-",
        carrierCode: event.args.carrierCode || "-",
        departureAirport: event.args.departureAirport || "-",
        arrivalAirport: "-", // Not available in this event
      };
    }

    return {
      flightNumber: "-",
      carrierCode: "-",
      departureAirport: "-",
      arrivalAirport: "-",
    };
  };

  const formatEventData = (event: any) => {
    if (!event || !event.args) return null;

    // Format based on event type
    switch (event.eventName) {
      case "FlightDataSet":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg">
                    {event.args.flightNumber}
                  </span>
                  <Badge variant="outline">{event.args.carrierCode}</Badge>
                </div>
                <Badge>{event.args.CurrentFlightStatus}</Badge>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Departure</div>
                  <div className="font-medium">
                    {event.args.departureAirport}
                  </div>
                  <div>{event.args.departureCity}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                <div className="text-right">
                  <div className="text-muted-foreground">Arrival</div>
                  <div className="font-medium">{event.args.arrivalAirport}</div>
                  <div>{event.args.arrivalCity}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Flight Number:</div>
              <div>{event.args.flightNumber}</div>

              <div className="font-medium">Carrier Code:</div>
              <div>{event.args.carrierCode}</div>

              <div className="font-medium">Departure Date:</div>
              <div>{event.args.scheduledDepartureDate}</div>

              <div className="font-medium">Operating Airline:</div>
              <div>{event.args.operatingAirlineCode}</div>

              <div className="font-medium">Departure Gate:</div>
              <div>{event.args.departureGate || "N/A"}</div>

              <div className="font-medium">Arrival Gate:</div>
              <div>{event.args.arrivalGate || "N/A"}</div>

              <div className="font-medium">Equipment:</div>
              <div>{event.args.equipmentModel || "N/A"}</div>

              <div className="font-medium">Status:</div>
              <div>{event.args.CurrentFlightStatus}</div>
            </div>
          </div>
        );

      case "currentFlightStatus":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg">
                    {event.args.flightNumber}
                  </span>
                  <Badge variant="outline">{event.args.carrierCode}</Badge>
                </div>
                <Badge
                  variant={
                    event.args.FlightStatus === "Cancelled"
                      ? "destructive"
                      : event.args.FlightStatus === "Landed" ||
                        event.args.FlightStatus === "Arrived At Gate"
                      ? "default"
                      : "outline"
                  }
                >
                  {event.args.FlightStatus}
                </Badge>
              </div>
              <div className="mt-2 text-sm">
                <div className="text-muted-foreground">Status Time</div>
                <div>{event.args.currentFlightStatusTime || "N/A"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Flight Number:</div>
              <div>{event.args.flightNumber}</div>

              <div className="font-medium">Carrier Code:</div>
              <div>{event.args.carrierCode}</div>

              <div className="font-medium">Departure Date:</div>
              <div>{event.args.scheduledDepartureDate}</div>

              <div className="font-medium">Status Time:</div>
              <div>{event.args.currentFlightStatusTime || "N/A"}</div>

              <div className="font-medium">Flight Status:</div>
              <div>
                <Badge
                  variant={
                    event.args.FlightStatus === "Cancelled"
                      ? "destructive"
                      : event.args.FlightStatus === "Landed" ||
                        event.args.FlightStatus === "Arrived At Gate"
                      ? "default"
                      : "outline"
                  }
                >
                  {event.args.FlightStatus}
                </Badge>
              </div>

              <div className="font-medium">Status Code:</div>
              <div>{event.args.FlightStatusCode}</div>
            </div>
          </div>
        );

      case "UTCTimeSet":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg mb-4">
              <div className="text-center">
                <div className="font-bold text-lg">Flight Schedule Times</div>
                <div className="text-sm text-muted-foreground">
                  UTC Time Update
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Scheduled Departure:</div>
              <div>{event.args.scheduledDepartureUTC}</div>

              <div className="font-medium">Scheduled Arrival:</div>
              <div>{event.args.scheduledArrivalUTC}</div>

              <div className="font-medium">Estimated Departure:</div>
              <div>{event.args.estimatedDepartureUTC}</div>

              <div className="font-medium">Estimated Arrival:</div>
              <div>{event.args.estimatedArrivalUTC}</div>

              <div className="font-medium">Actual Departure:</div>
              <div>{event.args.actualDepartureUTC}</div>

              <div className="font-medium">Actual Arrival:</div>
              <div>{event.args.actualArrivalUTC}</div>
            </div>
          </div>
        );

      case "SubscriptionDetails":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg">
                    {event.args.flightNumber}
                  </span>
                  <Badge variant="outline">{event.args.carrierCode}</Badge>
                </div>
                <Badge
                  variant={event.args.isSubscribe ? "default" : "secondary"}
                >
                  {event.args.isSubscribe ? "Subscribed" : "Unsubscribed"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Flight Number:</div>
              <div>{event.args.flightNumber}</div>

              <div className="font-medium">User:</div>
              <div className="font-mono text-xs break-all">
                {event.args.user}
              </div>

              <div className="font-medium">Carrier Code:</div>
              <div>{event.args.carrierCode}</div>

              <div className="font-medium">Departure Airport:</div>
              <div>{event.args.departureAirport}</div>

              <div className="font-medium">Subscribed:</div>
              <div>{event.args.isSubscribe ? "Yes" : "No"}</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Event details not formatted for this event type.
            </p>
          </div>
        );
    }
  };

  const formatTransactionData = (tx: any) => {
    if (!tx) return null;

    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs break-all max-w-[80%]">
              {tx.hash}
            </div>
            <Badge variant={tx.blockNumber ? "default" : "secondary"}>
              {tx.blockNumber ? "Confirmed" : "Pending"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="font-medium">Transaction Hash:</div>
          <div className="font-mono text-xs break-all flex items-center gap-2">
            <a
              href={`https://columbus.caminoscan.com/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center"
            >
              {tx.hash} <ExternalLink className="ml-1 h-3 w-3" />
            </a>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(tx.hash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="font-medium">Block Number:</div>
          <div>{tx.blockNumber || "Pending"}</div>

          <div className="font-medium">From:</div>
          <div className="font-mono text-xs break-all">{tx.from}</div>

          <div className="font-medium">To:</div>
          <div className="font-mono text-xs break-all">{tx.to}</div>

          <div className="font-medium">Value:</div>
          <div>
            {tx.value ? ethers.formatEther(tx.value) + " CAM" : "0 CAM"}
          </div>

          <div className="font-medium">Gas Limit:</div>
          <div>{tx.gasLimit?.toString() || "N/A"}</div>

          <div className="font-medium">Gas Price:</div>
          <div>
            {tx.gasPrice
              ? ethers.formatUnits(tx.gasPrice, "gwei") + " Gwei"
              : "N/A"}
          </div>

          <div className="font-medium">Nonce:</div>
          <div>{tx.nonce}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <ScrollArea className="h-[500px] w-full">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead className="w-[180px]">Txn DTM</TableHead>
              {type === "transaction" ? (
                <>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Value</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Flight</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Dep Airport</TableHead>
                  <TableHead>Arr Airport</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Flt Status</TableHead>
                  <TableHead>Dep State</TableHead>
                  <TableHead>Arr State</TableHead>
                  <TableHead>Dep Gate</TableHead>
                  <TableHead>Arr Gate</TableHead>
                  <TableHead>Sch Dep DTM</TableHead>
                  <TableHead>Sch Arr DTM</TableHead>
                  <TableHead>Est Dep DTM</TableHead>
                  <TableHead>Est Arr DTM</TableHead>
                  <TableHead>Act Dep DTM</TableHead>
                  <TableHead>Act Arr DTM</TableHead>
                  <TableHead>Baggedg Claim</TableHead>
                </>
              )}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const flightDetails =
                type === "event" ? getFlightDetails(item) : null;

              return (
                <TableRow
                  key={index}
                  className={index % 2 === 0 ? "bg-muted/20" : ""}
                >
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(
                      type === "transaction"
                        ? item.timestamp * 1000
                        : item.timestamp
                    )}
                  </TableCell>

                  {type === "transaction" ? (
                    <>
                      <TableCell className="font-mono text-xs truncate max-w-[150px]">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://columbus.caminoscan.com/tx/${item.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {item.hash}
                          </a>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(item.hash)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {copied ? "Copied!" : "Copy to clipboard"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>{item.blockNumber || "Pending"}</TableCell>
                      <TableCell>
                        {item.value
                          ? ethers.formatEther(item.value) + " CAM"
                          : "0 CAM"}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Badge
                          variant={
                            item.eventName === "currentFlightStatus"
                              ? "default"
                              : item.eventName === "FlightDataSet"
                              ? "secondary"
                              : "outline"
                          }
                          className="font-medium"
                        >
                          {item.eventName}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {flightDetails?.flightNumber}
                      </TableCell>
                      <TableCell>{flightDetails?.carrierCode}</TableCell>
                      <TableCell>{flightDetails?.departureAirport}</TableCell>
                      <TableCell>{flightDetails?.arrivalAirport}</TableCell>
                      <TableCell>
                        {item.args?.FlightStatus && (
                          <Badge
                            variant={
                              item.args.FlightStatus === "Cancelled"
                                ? "destructive"
                                : item.args.FlightStatus === "Landed" ||
                                  item.args.FlightStatus === "Arrived At Gate"
                                ? "default"
                                : "outline"
                            }
                          >
                            {item.args.FlightStatus}
                          </Badge>
                        )}
                      </TableCell>
                    </>
                  )}

                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>
                            {type === "transaction"
                              ? "Transaction Details"
                              : `${item.eventName} Event Details`}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <Tabs defaultValue="formatted">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="formatted">
                                Formatted
                              </TabsTrigger>
                              <TabsTrigger value="raw">Raw Data</TabsTrigger>
                            </TabsList>

                            <TabsContent
                              value="formatted"
                              className="p-4 border rounded-md"
                            >
                              {type === "transaction"
                                ? formatTransactionData(item)
                                : formatEventData(item)}
                            </TabsContent>

                            <TabsContent value="raw">
                              <ScrollArea className="h-[400px] w-full rounded-md border">
                                <pre className="bg-muted p-4 text-xs">
                                  {JSON.stringify(item, null, 2)}
                                </pre>
                              </ScrollArea>
                            </TabsContent>
                          </Tabs>
                        </div>
                        {type === "transaction" && (
                          <Button variant="outline" className="mt-2" asChild>
                            <a
                              href={`https://columbus.caminoscan.com/tx/${item.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              View on Camino Explorer{" "}
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}
