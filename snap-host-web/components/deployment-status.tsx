import { cn } from "@/lib/utils"

export type Status = "NOT_STARTED" | "BUILDING" | "READY" | "ERROR"

interface DeploymentStatusProps {
  status: Status
  className?: string
}

export function DeploymentStatus({ status, className }: DeploymentStatusProps) {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case "READY":
        return "bg-green-500"
      case "BUILDING":
      case "NOT_STARTED":
        return "bg-yellow-500"
      case "ERROR":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor(status))} />
      <span className="text-gray-300 text-sm">{status}</span>
    </div>
  )
}

