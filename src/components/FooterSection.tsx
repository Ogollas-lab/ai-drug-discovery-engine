import BrandLogo from "@/components/BrandLogo";

const FooterSection = () => (
  <footer className="border-t border-border py-12 px-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <BrandLogo size="sm" />
      <p className="text-xs text-muted-foreground font-mono text-center md:text-right">
        Pawanax AI · Research platform · Not for clinical use · Jun 2026
      </p>
    </div>
  </footer>
);

export default FooterSection;
