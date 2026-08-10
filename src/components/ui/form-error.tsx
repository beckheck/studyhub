interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null

  return <p className="text-sm text-red-600 dark:text-red-400 mt-1">{message}</p>
}
