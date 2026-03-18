interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex items-center ml-1 group">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-surface-3 text-text-muted hover:text-white text-[10px] font-semibold leading-none inline-flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bond-green"
        aria-label={text}
        tabIndex={0}
      >
        i
      </button>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded bg-surface-3 border border-border text-[11px] text-text-muted whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
      >
        {text}
      </span>
    </span>
  );
}
