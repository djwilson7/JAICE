import { useSettings } from "@/pages/settings/provider/settingsContext";

export function DemoReview() {
  const { reviewBehavior } = useSettings();
  const columnTitleClass = "font-bold whitespace-nowrap";

  const standardColumns = {
    applied: { title: "Applied" },
    interview: { title: "Interview" },
  };

  const reviewColumn = { title: "Review" };
  const columnClass = (title: string) =>
    title !== "Review" && reviewBehavior !== "inline"
      ? "passive-column demo-column"
      : "demo-column";

  const dynamicClass =
    reviewBehavior === "dynamic" ? "demo-column-dynamic" : "demo-column";

  return (
    <div>
      <div className="detail-text">
        {reviewBehavior === "inline" ? (
          <small>
            <em>Review cards will be shown within each standard column.</em>
          </small>
        ) : reviewBehavior === "column" ? (
          <small>
            <em>
              Always display a dedicated review column alongside other columns.
            </em>
          </small>
        ) : (
          <small>
            <em>
              Display a dedicated review column when there are cards that need
              reviewed.
            </em>
          </small>
        )}
      </div>
      <div className="demo-content-container">
        {Object.values(standardColumns).map((col) => (
          <div key={col.title} className={columnClass(col.title)}>
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
