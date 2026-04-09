import React from "react"

const statusConfig = {
  PAID: {
    label: "Paid",
    className: "bg-[--success]/10 text-[--success] border border-[--success]/20",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    className: "bg-[--warn]/10 text-[--warn] border border-[--warn]/20",
  },
  PENDING: {
    label: "Pending",
    className: "bg-[--danger]/10 text-[--danger] border border-[--danger]/20",
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
