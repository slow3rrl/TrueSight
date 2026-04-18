import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { LogOut, X } from "lucide-react";
import type { EnrolledClass } from "../services/studentClassroomService";

export type StudentSection = "home" | "enrolled" | "settings";

export type StudentSidebarItem = {
  key: StudentSection;
  label: string;
  icon: LucideIcon;
};

type StudentSidebarProps = {
  items: StudentSidebarItem[];
  activeSection: StudentSection;
  mobileOpen: boolean;
  enrolledClasses: EnrolledClass[];
  selectedClassId: string | null;
  onSelectSection: (section: StudentSection) => void;
  onSelectClass: (classId: string) => void;
  onCloseMobile: () => void;
  onLogout: () => void;
};

function SidebarNav({
  items,
  activeSection,
  expanded,
  onSelect,
}: {
  items: StudentSidebarItem[];
  activeSection: StudentSection;
  expanded: boolean;
  onSelect: (section: StudentSection) => void;
}) {
  return (
    <div className="mt-4 space-y-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeSection;

        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={[
              "theme-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
              "transition-all duration-200",
              active
                ? "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent)]"
                : "text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)] hover:text-[var(--app-text)]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span
              className={[
                "overflow-hidden whitespace-nowrap transition-all duration-200",
                expanded ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
              ].join(" ")}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EnrolledClassList({
  classes,
  selectedClassId,
  expanded,
  onSelectClass,
}: {
  classes: EnrolledClass[];
  selectedClassId: string | null;
  expanded: boolean;
  onSelectClass: (classId: string) => void;
}) {
  return (
    <div className="mt-4 border-t theme-border pt-4">
      <p
        className={[
          "overflow-hidden whitespace-nowrap text-xs font-semibold uppercase tracking-wide theme-muted transition-all duration-200",
          expanded ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
        ].join(" ")}
      >
        Enrolled Classes
      </p>

      <div className="mt-2 space-y-1.5">
        {classes.map((classroom) => (
          <button
            key={classroom.id}
            onClick={() => onSelectClass(classroom.id)}
            className={[
              "theme-ring flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
              selectedClassId === classroom.id
                ? "bg-[color-mix(in_srgb,var(--app-accent)_14%,transparent)] text-[var(--app-accent)]"
                : "text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] hover:text-[var(--app-text)]",
            ].join(" ")}
          >
            <span className="mr-3 h-2 w-2 shrink-0 rounded-full bg-[var(--app-accent)]/80" />
            <span
              className={[
                "truncate transition-all duration-200",
                expanded ? "max-w-[170px] opacity-100" : "max-w-0 opacity-0",
              ].join(" ")}
              title={classroom.name}
            >
              {classroom.name}
            </span>
          </button>
        ))}

        {classes.length === 0 && expanded && (
          <p className="px-3 py-2 text-xs theme-muted">No classes joined yet.</p>
        )}
      </div>
    </div>
  );
}

export function StudentSidebar({
  items,
  activeSection,
  mobileOpen,
  enrolledClasses,
  selectedClassId,
  onSelectSection,
  onSelectClass,
  onCloseMobile,
  onLogout,
}: StudentSidebarProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          "theme-surface fixed left-0 top-0 z-20 hidden h-screen flex-col px-3 py-4 md:flex",
          "transition-all duration-300",
          hovered ? "w-72" : "w-20",
        ].join(" ")}
      >
        <div className="flex h-11 items-center px-2">
          <span
            className={[
              "theme-title overflow-hidden whitespace-nowrap text-lg font-bold transition-all duration-200",
              hovered ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
            ].join(" ")}
          >
            Student Hub
          </span>
        </div>

        <SidebarNav
          items={items}
          activeSection={activeSection}
          expanded={hovered}
          onSelect={onSelectSection}
        />

        <EnrolledClassList
          classes={enrolledClasses}
          selectedClassId={selectedClassId}
          expanded={hovered}
          onSelectClass={onSelectClass}
        />

        <div className="mt-auto border-t theme-border pt-4">
          <button
            onClick={onLogout}
            className="theme-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 transition-all duration-200 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={[
                "overflow-hidden whitespace-nowrap transition-all duration-200",
                hovered ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
              ].join(" ")}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-[var(--sidebar-backdrop)] md:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="theme-surface fixed left-0 top-0 z-50 h-screen w-72 px-4 py-4 md:hidden"
            >
              <div className="flex items-center justify-between">
                <p className="theme-title text-lg font-bold">Student Hub</p>
                <button
                  onClick={onCloseMobile}
                  className="theme-ring inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <SidebarNav
                items={items}
                activeSection={activeSection}
                expanded={true}
                onSelect={(section) => {
                  onSelectSection(section);
                  onCloseMobile();
                }}
              />

              <EnrolledClassList
                classes={enrolledClasses}
                selectedClassId={selectedClassId}
                expanded={true}
                onSelectClass={(classId) => {
                  onSelectClass(classId);
                  onCloseMobile();
                }}
              />

              <div className="mt-auto border-t theme-border pt-4">
                <button
                  onClick={() => {
                    onLogout();
                    onCloseMobile();
                  }}
                  className="theme-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-400 transition-all duration-200 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
