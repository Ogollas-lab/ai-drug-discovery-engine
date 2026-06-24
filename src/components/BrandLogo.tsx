import { Link } from "react-router-dom";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: "w-7 h-7", title: "text-xs", tag: "text-[8px]" },
  md: { img: "w-9 h-9", title: "text-sm", tag: "text-[9px]" },
  lg: { img: "w-12 h-12", title: "text-lg", tag: "text-[10px]" },
};

const BrandLogo = ({ size = "md", showTagline = true, className = "" }: BrandLogoProps) => {
  const s = sizes[size];
  return (
    <Link to="/" className={`flex items-center gap-2.5 group shrink-0 ${className}`}>
      <div className={`${s.img} rounded-full overflow-hidden ring-2 ring-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.25)] group-hover:ring-primary/60 transition-all`}>
        <img
          src="/pawanax-logo.png"
          alt="Pawanax AI"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-bold ${s.title} tracking-tight text-foreground`}>
          Pawanax<span className="text-primary"> AI</span>
        </span>
        {showTagline && (
          <span className={`${s.tag} font-mono text-primary/80 tracking-widest uppercase`}>
            Drug Discovery Platform
          </span>
        )}
      </div>
    </Link>
  );
};

export default BrandLogo;
