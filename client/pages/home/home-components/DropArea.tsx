import { motion } from "framer-motion";
import archiveIcon from "../../../assets/icons/folder.svg";
import trashIcon from "../../../assets/icons/trash.svg";
import { useCallback, useState } from "react";

interface DropAreaProps {
  onDragEnter: (id: string) => void;
  onDragLeave: () => void;
}

export function DropArea({ onDragEnter, onDragLeave }: DropAreaProps) {
  const dropAreaClass = "flex w-1/2 p-4 justify-center items-center gap-2";

  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  const archiveIconColor = hoveredArea === "archive" ? "orangeIcon" : "icon";
  const trashIconColor = hoveredArea === "delete" ? "redIcon" : "icon";

  const handlePointerEnter = useCallback(
    (id: string) => {
      setHoveredArea(id);
      onDragEnter(id);
    },
    [onDragEnter]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredArea(null);
    onDragLeave();
  }, [onDragLeave]);

  return (
    <div className="drop-area">
      <div className="flex flex-col w-full h-full items-center justify-center">
        {/* <h3 className="primary-text py-2">Drag to Archive or Delete</h3> */}
        {/* <hr className="flex w-full border-dashed border-2 border-gray-400"/> */}
        <div className="flex w-full items-center justify-center">
          <motion.div
            className={`${dropAreaClass}`}
            style={{
              boxShadow: "inset 0px -15px 14px 0px rgba(255, 140, 0, 0.7)",
            }}
            onPointerEnter={() => handlePointerEnter("archive")}
            onPointerLeave={handlePointerLeave}
            animate={{
              background:
                hoveredArea === "archive"
                  ? "rgba(255, 140, 0, 0.1)"
                  : "transparent",
            }}
          >
            <motion.div
              className="flex items-center justify-center"
              animate={{ x: hoveredArea === "archive" ? -100 : 0 }}
            >
              <img
                src={archiveIcon}
                alt="Archive Icon"
                className={`h-8 w-8 mr-2 ${archiveIconColor}`}
              />
              <h2 className="primary-text">Archive</h2>
            </motion.div>
          </motion.div>

          <motion.div
            className={`${dropAreaClass}`}
            style={{
              boxShadow: "inset 0px -15px 14px 0px rgba(255, 0, 0, 0.7)",
            }}
            onPointerEnter={() => handlePointerEnter("delete")}
            onPointerLeave={handlePointerLeave}
            animate={{
              background:
                hoveredArea === "delete"
                  ? "rgba(255, 0, 0, 0.1)"
                  : "transparent",
            }}
          >
            <motion.div
              className="flex items-center justify-center"
              animate={{ x: hoveredArea === "delete" ? 100 : 0 }}
            >
              <img
                src={trashIcon}
                alt="Trash Icon"
                className={`h-8 w-8 mr-2 ${trashIconColor}`}
              />
              <h2 className="primary-text">Trash</h2>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
