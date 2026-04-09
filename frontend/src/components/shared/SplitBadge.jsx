import React from "react"

const statusConfig = {
  PAID: {
    label: "Paid",
    className: "badge-paid",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    className: "badge-partial",
  },
  PENDING: {
    label: "Pending",
    className: "badge-pending",
  },
}

export default function SplitBadge({ status }) {
  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
