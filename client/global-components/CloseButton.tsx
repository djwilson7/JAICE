export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="modal-close-button"
      title="Close"
      aria-label="Close modal"
    >
      x
    </button>
  );
}
