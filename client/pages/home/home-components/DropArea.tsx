import archiveIcon from "../../../assets/icons/folder.svg";
import trashIcon from "../../../assets/icons/trash.svg";
import { useCallback } from "react";

interface DropAreaProps {
  onDragEnter: (id: string) => void;
  onDragLeave: () => void;
}

export function DropArea({ onDragEnter, onDragLeave }: DropAreaProps) {
  const dropAreaClass = "flex w-1/2 p-4 justify-center items-center gap-2";

  const handlePointerEnter = useCallback(
    (id: string) => {
      onDragEnter(id);
    },
    [onDragEnter]
  );

  const handlePointerLeave = useCallback(() => {
    onDragLeave();
  }, [onDragLeave]);

  return (
    <div className="drop-area">
      <div className="flex flex-col gap-4 w-full h-full items-center justify-center">
        <h3 className="primary-text">Drag to Archive or Delete</h3>

        <div className="flex w-full items-center justify-center">
          <div
            className={dropAreaClass}
            onPointerEnter={() => handlePointerEnter("archive")}
            onPointerLeave={handlePointerLeave}
          >
            <img
              src={archiveIcon}
              alt="Archive Icon"
              className="h-10 w-10 mr-2 icon"
            />
            <h2 className="primary-text">Archive</h2>
          </div>

          <div
            className={dropAreaClass}
            onPointerEnter={() => handlePointerEnter("delete")}
            onPointerLeave={handlePointerLeave}
          >
            <img
              src={trashIcon}
              alt="Trash Icon"
              className="h-10 w-10 mr-2 icon"
            />
            <h2 className="primary-text">Delete</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
