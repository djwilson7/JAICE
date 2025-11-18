// import { localfiles } from "@/directory/path/to/localimport";
interface DaysToSyncProps {
  show: boolean;
  options: number[];
  onSelection: (days: number) => void;
  onCancel: () => void;
}

// A component that displays a modal for selecting days to sync emails
export function DaysToSync({
  show,
  options,
  onSelection,
  onCancel,
}: DaysToSyncProps) {
  if (!show) return null;

  return (
    <div className="fixed flex inset-0 w-full h-full bg-black/80 border border-black rounded-xl shadow-lg p-6 z-100 items-center justify-center">
      <div
        className="fixed absolute top-0 right-0 p-6 text-white text-3xl font-bold cursor-pointer"
        onClick={() => onCancel()}
      >
        <button onClick={onCancel}>X</button>
      </div>


      <div className="flex flex-col items-center justify-center w-3/4 border-1 border-white rounded-xl bg-black/80 p-6 gap-6">
        <h2 className="text-2xl font-bold w-full text-center text-white">
          How far back should we sync your emails?
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-4 justify-center w-full">
          {options.map((days) => (
            <button
              key={days}
              onClick={() => onSelection(days)}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors mb-2"
            >
              {days} days
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
