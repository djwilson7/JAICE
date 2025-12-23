import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function DemoReview() {
  const { reviewBehavior } = useSettings();
  const columnTitleClass = "font-bold whitespace-nowrap";

  const standardColumns = {
    applied: { title: "Applied" },
    interview: { title: "Interview" },
  };

  const reviewColumn = { title: "Review" };

  const dynamicClass = reviewBehavior === "dynamic" ? "demo-column-dynamic" : "demo-column";

  return (
    <div>
      <div className="flex flex-col w-full gap-4">
        {reviewBehavior === "inline" ? (
          <div className="text-center mb-2">
            <em>
              Review cards will be shown within each standard column.
            </em>
          </div>
        ) : reviewBehavior === "column" ? (
          <div className="text-center mb-2">
            <em>
              Always display a dedicated review column alongside other columns.
            </em>
          </div>
        ) : (
          <div className="text-center mb-2">
            <em>
              Only display a dedicated review column when there are cards that need reviewed.
            </em>
          </div>
        )}
      </div>
      <div className="demo-content-container">
        {Object.values(standardColumns).map((col) => (
          <div key={col.title} className="demo-column">
            <div className={`${columnTitleClass} mt-2`}>{col.title}</div>
            <hr className="header-split" />
            {reviewBehavior === "inline" ? (
              <div className="flex flex-col gap-2">
                <div className="demo-column-card-review">
                  <em>Review</em>
                </div>
                <div className="demo-column-card">Content</div>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="demo-column-card">Content</div>
              </div>
            )}
          </div>
        ))}
        {reviewBehavior !== "inline" && (
          <div className={dynamicClass}>
            <div className={`${columnTitleClass} mt-2`}>
              {reviewColumn.title}
            </div>
            <hr className="header-split" />
            <div className="demo-column-card-review">Review</div>
          </div>
        )}
      </div>
    </div>
  );
}
