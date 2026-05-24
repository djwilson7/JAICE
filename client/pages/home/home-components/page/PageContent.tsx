export function PageContent({ children }: { children: React.ReactNode }) {
    return (
    <div className="flex h-full min-h-0 w-full flex-col items-start gap-0 overflow-visible p-2">
        {children}
    </div>
    );
}
