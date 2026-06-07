const rowContentRules = "flex w-full items-center md:w-1/2";
const rowRules = "flex flex-col w-full items-center justify-center py-4";
const rowAlignmentRules = "flex flex-col w-full items-center gap-4 md:flex-row md:justify-between";
const errorRules = "flex w-full items-center justify-center my-2";

export const Row = ({
  rowError,
  children,
}: {
  rowError?: string;
  children: React.ReactNode;
}) => (
  <div className={`${rowRules}`}>
    <div className={rowAlignmentRules}>{children}</div>
    {rowError && (
      <div className={errorRules}>
        <small className="red-text" role="alert">
          {rowError}
        </small>
      </div>
    )}
  </div>
);

export const RowItem = ({ children }: { children: React.ReactNode }) => (
  <div className={rowContentRules}>{children}</div>
);
