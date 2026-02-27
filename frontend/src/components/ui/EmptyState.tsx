interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
}

export default function EmptyState({ icon = '📭', title, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-message">{message}</div>}
    </div>
  )
}
