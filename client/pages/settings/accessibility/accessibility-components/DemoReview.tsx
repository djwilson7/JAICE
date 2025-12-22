import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function DemoReview() {
  const { reviewBehavior } = useSettings();
  const inline = reviewBehavior === "inline";

  const columnTitleClass = "font-bold whitespace-nowrap";

  const standardColumns = {
    applied: { title: "Applied" },
    interview: { title: "Interview" },
  };

  const reviewColumn = { title: "Review" };

  return (
    <div>
      <div className="flex flex-col w-full gap-4">
        {inline ? (
          <div className="text-center mb-2">
            <em>
              The model will display review cards inline with content cards based on the stage it believes they belong to.
            </em>
          </div>
        ) : (
          <div className="text-center mb-2">
            <em>
              Cards flagged for review are displayed in a dedicated review column allowing you to manage them separately.
            </em>
          </div>
        )}
      </div>
      <div className="demo-content-container">
        {Object.values(standardColumns).map((col) => (
          <div key={col.title} className="demo-column">
            <div className={`${columnTitleClass} mt-2`}>{col.title}</div>
            <hr className="header-split" />
            {inline ? (
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
        {!inline && (
          <div className="demo-column">
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
