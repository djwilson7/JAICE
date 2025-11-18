import { useRef, useState, useMemo, useCallback, type JSX } from "react";
import { SearchBar } from "@/global-components/SearchBar";
import { DropDownMenu } from "@/global-components/DropDownMenu";
import { CheckBoxToggle } from "@/global-components/CheckBoxToggle";
import filterIcon from "@/assets/icons/filter.svg";
import infoIcon from "@/assets/icons/info.svg";
import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { MultiSelectBar } from "@/pages/home/home-components/MultiSelectBar";
import { JobCard } from "@/pages/home/home-components/JobCards";
import { Column } from "@/pages/home/home-components/Column";
import type { JobCardType } from "@/types/jobCardType";

export function HomeInfoContent() {
  const [jobs, setJobs] = useState<JobCardType[]>([
    { id: "demo", title: "Drag or Click Me", column: "applied", date: "—" },
  ]);

  const itemDraggedRef = useRef<JobCardType | null>(null);
  const isOverRef = useRef<string | null>(null);

  const handleDragStart = (job: JobCardType) => {
    itemDraggedRef.current = job;
  };

  const handleDragEnterColumn = (columnId: string) => {
    isOverRef.current = columnId;
  };

  const handleDragLeaveColumn = () => {
    isOverRef.current = null;
  };

  const handleDragEnd = () => {
    const itemDragged = itemDraggedRef.current;
    const isOver = isOverRef.current;

    if (itemDragged && isOver && itemDragged.column !== isOver) {
      console.log(`Dropped item ${itemDragged.id} into column ${isOver}`);

      const updatedCard = { ...itemDragged, column: isOver };
      setJobs((prev) =>
        prev.map((job) =>
          job.id === itemDragged.id ? { ...job, column: isOver } : job
        )
      );
    }
    itemDraggedRef.current = null;
    isOverRef.current = null;
  };

  const columnConfig = useMemo(
    () => [
      { id: "applied", title: "Applied", bg: "var(--color-light-purple)" },
      { id: "interview", title: "Interview", bg: "var(--color-teal)" },
    ],
    []
  );

  const jobsByColumn = useMemo(() => {
    return columnConfig.reduce<Record<string, JSX.Element[]>>((acc, column) => {
      acc[column.id] = jobs
        .filter((job) => job.column === column.id)
        .map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isMultiSelecting={false}
            handleMultiSelectClick={() => {}}
          />
        ));
      return acc;
    }, {});
  }, [jobs, columnConfig]);

  return (
    <div className="flex flex-col text-left gap-8 p-6 text-sm text-gray-100">
      {/* ───────── Intro ───────── */}
      <section>
        <h2 className="text-lg font-semibold mb-2">
          Welcome to Your Dashboard
        </h2>
        <p>
          This is your workspace for managing job applications. You can view,
          sort, and move cards between stages. Use this guide as a live
          reference to understand each element.
        </p>
      </section>

      {/* ───────── Control Bar ───────── */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Control Bar</h2>
        <p className="mb-3">
          The Control Bar at the top provides quick access to search, filters,
          and tools.
        </p>

        <div className="flex flex-col gap-5 bg-black/40 rounded-lg p-4">
          <div>
            <SearchBar
              isSearching={true}
              setIsSearching={() => {}}
              searchQuery={"developer"}
              setSearchQuery={() => {}}
            />
            <p className="mt-2 text-gray-300">
              <strong>Search Bar:</strong> Filters your job cards as you type.
              Non-matching cards fade slightly.
            </p>
          </div>

          <div>
            <DropDownMenu
              options={[
                { value: "new", label: "Newest First" },
                { value: "old", label: "Oldest First" },
              ]}
              isOpen={false}
              selectedOption="new"
              setIsOpen={() => {}}
              setSelectedOption={() => {}}
              leftIcon={filterIcon}
            />
            <p className="mt-2 text-gray-300">
              <strong>Filter Menu:</strong> Sorts applications by date or
              alphabetically.
            </p>
          </div>

          <div>
            <CheckBoxToggle
              label={"Multi Select"}
              inactiveIcon={uncheckIcon}
              activeIcon={checkIcon}
              isChecked={true}
              setIsChecked={() => {}}
            />
            <p className="mt-2 text-gray-300">
              <strong>Multi-Select:</strong> Lets you select several cards for
              batch actions.
            </p>
          </div>

          <div>
            <CheckBoxToggle
              label={"Info"}
              inactiveIcon={infoIcon}
              activeIcon={infoIcon}
              isChecked={true}
              setIsChecked={() => {}}
            />
            <p className="mt-2 text-gray-300">
              <strong>Info Button:</strong> Opens this reference panel so you
              can learn while exploring.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Columns & Job Card (Interactive Demo) ───────── */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Columns and Job Card</h2>
        <p className="mb-3">
          Each column represents a stage. Try dragging the{" "}
          <strong>“Drag or Click Me”</strong> card between columns to see how movement
          works.
        </p>

        <div className="flex gap-4 bg-black/40 rounded-lg p-4">
          {columnConfig.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              bg={col.bg}
              count={jobsByColumn[col.id]?.length || 0}
              sharedHeight={200}
              reportHeight={() => {}}
              onDragEnter={handleDragEnterColumn}
              onDragLeave={handleDragLeaveColumn}
            >
              {jobsByColumn[col.id]}
            </Column>
          ))}
        </div>

        <p className="mt-2 text-gray-300">
          <strong>Job Card:</strong> Represents a single application. You can
          click or drag it to reorganize stages.
        </p>
      </section>

      {/* ───────── Multi-Select Bar ───────── */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Multi-Select Bar</h2>
        <p className="mb-3">
          When you select multiple jobs, a toolbar appears at the bottom to
          manage them together while checkboxes appear on each job card.
        </p>

        <div className="bg-black/40 rounded-lg p-4">
          <MultiSelectBar
            selectedJobs={[
              { id: "1", title: "UI Engineer", column: "applied" },
              { id: "2", title: "Backend Developer", column: "interview" },
            ]}
            setSelectedJobs={() => {}}
            setIsMultiSelecting={() => {}}
            className="relative static w-full bg-black/30 rounded-lg p-3"
          />
        </div>

        <p className="mt-2 text-gray-300">
          <strong>Multi-Select Bar:</strong> Use it to move, archive, or delete
          selected jobs. The label updates to show your intended action.
        </p>
      </section>

      {/* ───────── Closing Note ───────── */}
      <section className="border-t border-gray-700 pt-4 text-gray-400 text-xs">
        <p>
          Everything here is interactive but isolated from real data. Experiment
          freely — this panel exists to help you learn how the workspace
          behaves.
        </p>
      </section>
    </div>
  );
}
