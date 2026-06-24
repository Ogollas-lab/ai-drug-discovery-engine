import BrandLogo from "@/components/BrandLogo";

const FooterSection = () => (
  <footer className="border-t border-border py-10 sm:py-12 px-4 sm:px-6 safe-bottom">
    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
      <BrandLogo size="sm" />

      <div className="flex flex-col items-center sm:items-end gap-2 text-center sm:text-right">
        <p className="text-xs text-muted-foreground font-mono leading-relaxed max-w-sm">
          <span className="text-foreground font-display font-semibold">Vitalis AI Drug Engine</span>
          {" · "}
          Intelligence by{" "}
          <span className="text-primary">Pawanax AI</span>
        </p>
        <p className="text-[10px] text-muted-foreground/80 font-mono">
          Research platform · Not for clinical use · Jun 2026
        </p>
      </div>
    </div>
  </footer>
);

export default FooterSection;
