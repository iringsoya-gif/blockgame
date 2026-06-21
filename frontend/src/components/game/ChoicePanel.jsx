export default function ChoicePanel({ choices, onChoose, disabled }) {
  if (!choices?.length) return null
  return (
    <div className="space-y-2 pt-1">
      <p className="text-brand-muted font-mono text-2xs tracking-widest">— 선택하세요 —</p>
      {choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => onChoose(choice)}
          disabled={disabled}
          className="w-full text-left px-4 py-2.5 rounded-lg
                     border border-brand-border bg-brand-panelLight
                     text-brand-text text-sm font-body
                     hover:border-brand-accent/70 hover:bg-brand-accent/10 hover:translate-x-1
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150 group"
        >
          <span className="text-brand-accent font-mono text-xs mr-2.5
                           group-hover:text-brand-accentHover transition-colors">
            {i + 1}.
          </span>
          {choice}
        </button>
      ))}
    </div>
  )
}
