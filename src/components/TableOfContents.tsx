import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface HeadingItem {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  headings: HeadingItem[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState("");

  // Track active heading in viewport
  useEffect(() => {
    if (headings.length < 2) return;

    const visibleMap: Record<string, boolean> = {};

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-id");
          if (id) {
            if (entry.isIntersecting) {
              visibleMap[id] = true;
            } else {
              delete visibleMap[id];
            }
          }
        });

        // Find the first heading in the DOM order that is currently intersecting
        const firstVisible = headings.find((h) => visibleMap[h.id]);
        if (firstVisible) {
          setActiveId(firstVisible.id);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -60% 0px" }
    );

    headings.forEach((h) => {
      const el = document.querySelector(`[data-id="${h.id}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  // If there are less than 2 headings, do not render the component
  if (headings.length < 2) return null;

  const handleHeadingClick = (blockId: string) => {
    // Find the element in BlockNote's DOM and scroll to it smoothly
    const element = document.querySelector(`[data-id="${blockId}"]`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="toc-container">
      <h4 className="toc-title">{t("editor.tableOfContents", "İçindekiler")}</h4>
      <ul className="toc-list">
        {headings.map((heading, index) => {
          const isActive = activeId === heading.id;
          
          let paddingLeft = 0;
          if (heading.level === 1) {
            paddingLeft = 0;
          } else if (heading.level === 2) {
            paddingLeft = 12;
          } else if (heading.level === 3) {
            paddingLeft = 24;
          } else if (heading.level >= 4) {
            paddingLeft = 32;
          }

          return (
            <li
              key={`${heading.id}-${index}`}
              className={`toc-item ${isActive ? "active" : ""}`}
              style={{ paddingLeft: `${paddingLeft}px` }}
              onClick={() => handleHeadingClick(heading.id)}
              title={heading.text}
            >
              {heading.text || (heading.level === 1 ? t("editor.heading1", "Başlık 1") : heading.level === 2 ? t("editor.heading2", "Başlık 2") : t("editor.heading3", "Başlık 3"))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
