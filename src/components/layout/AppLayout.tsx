import React, { useState } from 'react';
import { Sidebar, NavigationSection } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  onOpenQuickAction: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentSection,
  onSelectSection,
  onOpenQuickAction,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sectionTitles: Record<NavigationSection, string> = {
    dashboard: 'Business Intelligence Dashboard',
    students: 'Central Student Directory',
    applications: 'Global Admissions Pipeline',
    countries: 'Country & Destination Management',
    partners: 'B2B Partners & Creator Network',
    finance: 'Multi-Currency Financial Ledger',
    documents: 'Document Vault & Compliance',
    team: 'Team Workspace & Access Control',
    settings: 'System & Schema Settings',
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex">
      {/* Sidebar for Desktop & Drawer for Mobile */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={onSelectSection}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header
          currentSectionTitle={sectionTitles[currentSection] || currentSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenQuickAction={onOpenQuickAction}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Bottom Navigation for Phone Viewports */}
        <MobileNav
          currentSection={currentSection}
          onSelectSection={onSelectSection}
          onOpenFullMenu={() => setMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
};

