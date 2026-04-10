import React from 'react';
const TypingDots: React.FC = () => (
  <div className="flex items-center gap-0.5 px-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce-dot"
        style={{ animationDelay: `${i * 0.16}s` }}
      />
    ))}
  </div>
);
export default TypingDots;
