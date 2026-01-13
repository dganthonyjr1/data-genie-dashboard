interface DataDisclaimerProps {
  variant?: "footer";
  className?: string;
}

export const DataDisclaimer = ({ variant = "footer", className = "" }: DataDisclaimerProps) => {
  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      Data extracted from publicly available sources only. Results depend on what businesses publicly display.
    </div>
  );
};
