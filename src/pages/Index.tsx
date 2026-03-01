import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import PipelineSection from "@/components/PipelineSection";
import MoleculeAnalyzer from "@/components/MoleculeAnalyzer";
import MetricsSection from "@/components/MetricsSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
      <PipelineSection />
      <MoleculeAnalyzer />
      <MetricsSection />
      <FooterSection />
    </div>
  );
};

export default Index;
