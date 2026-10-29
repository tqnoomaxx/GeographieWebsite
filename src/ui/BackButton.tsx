import type { ButtonHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'

/** Follow the same history entry as the browser's Back button; direct links use a local fallback. */
export function BackButton({
  fallback,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { fallback: string }) {
  const navigate = useNavigate()
  return (
    <button
      {...props}
      type="button"
      onClick={() => {
        const index = window.history.state?.idx
        if (Number.isSafeInteger(index) && index > 0) navigate(-1)
        else navigate(fallback, { replace: true })
      }}
    >
      {children}
    </button>
  )
}
