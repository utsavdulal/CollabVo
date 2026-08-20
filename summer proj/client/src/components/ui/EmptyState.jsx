export function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-gray-300 mb-3" />}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1 text-xs text-gray-500 max-w-xs">{message}</p>}
    </div>
  );
}
