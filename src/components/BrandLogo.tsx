import { Link } from "react-router-dom";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  /** "product" = Vitalis prominent; "ai" = Pawanax AI prominent */
  variant?: "product" | "ai";
  className?: string;
}

const sizes = {
  sm: { img: "w-7 h-7", product: "text-[11px]", ai: "text-[8px]", tag: "text-[7px]" },
  md: { img: "w-9 h-9", product: "text-sm", ai: "text-[9px]", tag: "text-[8px]" },
  lg: { img: "w-12 h-12", product: "text-lg", ai: "text-[10px]", tag: "text-[9px]" },
};

const BrandLogo = ({
  size = "md",
  showTagline = true,
  variant = "product",
  className = "",
}: BrandLogoProps) => {
  const s = sizes[size];

  return (
    <Link
      to="/"
      className={`flex items-center gap-2.5 group shrink-0 min-h-[44px] ${className}`}
      aria-label="Vitalis AI Drug Engine — powered by Pawanax AI"
    >
      <div
        className={`${s.img} rounded-full overflow-hidden ring-2 ring-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.25)] group-hover:ring-primary/60 transition-all shrink-0`}
        title="Pawanax AI"
      >
        <img
          src="/pawanax-logo.png"
          alt="Pawanax AI"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col leading-tight min-w-0">
        {variant === "product" ? (
          <>
            <span
              className={`font-display font-bold ${s.product} tracking-tight text-foreground truncate`}
            >
              Vitalis<span className="text-primary"> AI</span>
            </span>
            {showTagline && (
              <span
                className={`${s.tag} font-mono text-muted-foreground tracking-widest uppercase`}
              >
                Drug Engine
              </span>
            )}
            {showTagline && size !== "sm" && (
              <span className={`${s.ai} font-mono text-primary/70 tracking-wide mt-0.5`}>
                by Pawanax AI
              </span>
            )}
          </>
        ) : (
          <>
            <span
              className={`font-display font-bold ${s.product} tracking-tight text-foreground`}
            >
              Pawanax<span className="text-primary"> AI</span>
            </span>
            {showTagline && (
              <span
                className={`${s.tag} font-mono text-primary/80 tracking-widest uppercase`}
              >
                Intelligence Layer
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
};

export default BrandLogo;
