export function PageContent({ children }: { children: React.ReactNode }) {
    return (
    <div className="w-full h-full flex flex-col items-start gap-4 p-4 overflow-y-auto">
        {children}
    </div>
    );
}