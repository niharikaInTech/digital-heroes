'use client';

// A submit button that asks "are you sure?" first.
export default function ConfirmButton({ children, message, className }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
