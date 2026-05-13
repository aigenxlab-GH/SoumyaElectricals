import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'

/**
 * Password input with an always-visible eye toggle on the right.
 * Drop-in replacement for `<input type="password" ... />`.
 * Works with React Hook Form `register()` via forwardRef.
 *
 * Usage:
 *   <PasswordInput {...register('password')} className="form-input" />
 */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...rest }, ref) {
    const [shown, setShown] = useState(false)
    return (
      <div className="relative">
        <input
          {...rest}
          ref={ref}
          type={shown ? 'text' : 'password'}
          className={`${className ?? ''} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          tabIndex={-1}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {shown ? (
            // eye-off
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-10-7-10-7a17.93 17.93 0 014.06-5.94M9.88 4.24A10.94 10.94 0 0112 4c7 0 10 7 10 7a17.91 17.91 0 01-2.06 3.06M1 1l22 22" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.12 14.12a3 3 0 01-4.24-4.24" />
            </svg>
          ) : (
            // eye
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    )
  }
)
