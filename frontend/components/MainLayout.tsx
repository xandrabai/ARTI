"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // added useRouter
import { useEffect, ReactNode } from "react";             // added useEffect

type MainLayoutProps = {
  children: ReactNode;
};

const tabs = [
  { 
    key: "create",           // added key
    href: "/", 
    label: "Create", 
    subtext: "Express yourself",
    paths: ["/", "/artworks", "/canvas"],  // added paths
  },
  { 
    key: "gallery",          // added key
    href: "/gallery", 
    label: "Gallery", 
    subtext: "Your collection",
    paths: ["/gallery"],     // added paths
  },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter(); // added

  const isCreateFlow = pathname === '/' || pathname.startsWith('/artworks') || pathname.startsWith('/canvas'); // added /canvas

  // ADDED: save current URL for each tab whenever pathname changes
  useEffect(() => {
    const matchingTab = tabs.find((tab) =>
      tab.paths.some((p) => pathname === p || pathname.startsWith(p + "/"))
    );
    if (matchingTab) {
      sessionStorage.setItem(`arti.tab.${matchingTab.key}`, pathname + window.location.search);
    }
  }, [pathname]);

  // ADDED: navigate to last saved URL for a tab instead of fixed href
  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, tab: typeof tabs[0]) => {
    e.preventDefault();
    const saved = sessionStorage.getItem(`arti.tab.${tab.key}`);
    router.push(saved ?? tab.href);
  };

  return (
    <div className="min-h-screen bg-[#f5f2eb] pb-0 relative">
      <div className="pb-24">{children}</div>
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 w-full z-[120] border-t border-[#e0dbd1]"
      >
        <ul className="flex w-full m-0 p-0 h-24">
          {tabs.map((tab) => {
            // YOUR ORIGINAL LOGIC — unchanged
            const isCreateTabInFlow = tab.label === 'Create' && isCreateFlow;
            const isActive = !isCreateTabInFlow && (tab.href === '/' ? isCreateFlow : pathname === tab.href);

            const content = (
              <div className="text-left w-32">
                <div className="text-xl font-medium text-[#504538] leading-tight">{tab.label}</div>
                <div className="text-[13px] text-[#8f8173] mt-1">{tab.subtext}</div>
              </div>
            );

            // YOUR ORIGINAL non-clickable div — unchanged
            if (isCreateTabInFlow) {
              return (
                <li key={tab.href} className="flex-1 list-none">
                  <div className="flex w-full h-full items-center justify-center bg-[#d3c5b3] cursor-default">
                    {content}
                  </div>
                </li>
              );
            }

            return (
              <li key={tab.href} className="flex-1 list-none">
                <Link
                  href={tab.href}
                  onClick={(e) => handleTabClick(e, tab)} // added onClick
                  className={[
                    "flex w-full h-full items-center justify-center transition-colors",
                    isActive ? "bg-[#d3c5b3]" : "bg-[#f5f2eb] hover:bg-[#eae4d8]",
                  ].join(" ")}
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}