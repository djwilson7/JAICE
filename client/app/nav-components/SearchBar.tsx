import searchIcon from "@/assets/icons/search.svg";

export function SearchBar() {
  return (
    <div className="relative w-full ">
      <input
        type="text"
        placeholder="Search..."
        className="px-4 py-2 pl-10 rounded-lg border border-[var(--primary-two)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-two)] focus:border-transparent w-full placeholder:secondary-text animate-element"
      />
      <img
        src={searchIcon}
        alt="Search"
        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 icon"
      />
    </div>
  );
}
