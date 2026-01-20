const rowContentRules = "flex w-full md:w-1/2";
const rowRules = "flex flex-col w-full items-center justify-center py-4";
const rowAlignmentRules = "flex flex-col w-full md:flex-row gap-4";
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

export const Section = ({ children }: { children: React.ReactNode }) => (
  <section className="account-section w-[400px] sm:w-[500px] md:w-[600px] lg:w-1/2 animate-element">
    {children}
  </section>
);

export const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex w-full flex-col">
    <h1 className="w-full text-center">{title}</h1>
    <hr className="header-split" />
  </div>
);

export const SectionBody = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col w-full my-4 gap-4">{children}</div>
);
