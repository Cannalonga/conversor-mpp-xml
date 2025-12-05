import {
  Header,
  Hero,
  WhyChooseUs,
  ToolsGrid,
  HowItWorks,
  Pricing,
  SecuritySection,
  Footer,
  CookieBanner,
  HeaderAd,
  MidContentAd,
  FooterAd,
} from '@/components/landing';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#F7F9FB]">
      {/* Fixed Header */}
      <Header />
      
      {/* Top Ad Banner - After Header */}
      <div className="pt-20">
        <HeaderAd />
      </div>
      
      {/* Hero Section */}
      <Hero />
      
      {/* Why Choose Us - 4 Feature Cards */}
      <WhyChooseUs />
      
      {/* Mid-Content Ad */}
      <MidContentAd />
      
      {/* Tools Grid - 20 Converters */}
      <ToolsGrid />
      
      {/* How It Works - 3 Steps */}
      <HowItWorks />
      
      {/* Mid-Content Ad */}
      <MidContentAd />
      
      {/* Pricing Plans */}
      <Pricing />
      
      {/* Security & LGPD Section */}
      <SecuritySection />
      
      {/* Footer Ad */}
      <FooterAd />
      
      {/* Footer */}
      <Footer />
      
      {/* Cookie Consent Banner */}
      <CookieBanner />
    </main>
  );
}
